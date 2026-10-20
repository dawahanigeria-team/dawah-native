/**
 * Downloads API Service
 * Handles download counter increments via backend
 */

import { apiClient } from './base.api';
import { applyDownloadUsage } from '../../stores/premiumStore';
import { logger } from '@/utils/logger';

export interface DownloadApiResponse {
  _id: string;
  lecid: string;
  url: string;
  title: string;
  downloads?: number;
  // Free-tier quota, present only for signed-in callers. `downloads_remaining`
  // is null for premium (unlimited).
  download_count?: number;
  free_download_limit?: number;
  downloads_remaining?: number | null;
  download_period?: string;
  [key: string]: any; // Other MP3 metadata fields
}

/**
 * Thrown when the download cannot be attributed to a signed-in user.
 *
 * Downloads are sign-in only server-side: `download_api.php` refuses an
 * anonymous or unverifiable caller with 401 before it hands out any media URL.
 * Distinct from a network failure so the UI can offer sign-in instead of
 * "try again", and so an expected refusal is not filed as a crash.
 */
export class DownloadAuthRequiredError extends Error {
  readonly code = 'AUTH_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'DownloadAuthRequiredError';
  }
}

/** Thrown when the caller has spent their free monthly download allowance. */
export class DownloadLimitReachedError extends Error {
  readonly code = 'DOWNLOAD_LIMIT_REACHED';

  constructor(
    message: string,
    readonly downloadCount: number,
    readonly freeDownloadLimit: number,
  ) {
    super(message);
    this.name = 'DownloadLimitReachedError';
  }
}

class DownloadsApiService {
  /**
   * Increment download counter and get MP3 metadata
   * This MUST be called before downloading a lecture
   */
  async incrementDownloadCounter(lecid: string): Promise<DownloadApiResponse> {
    try {
      logger.debug('Sending to download API:', { lecid });
      const response = await apiClient.post<DownloadApiResponse>('/api/download_api.php', {
        lecid,
      });

      logger.debug('Download API response:', response.data);

      // Keep the store in step with the server's count so the Download button
      // and the "N left this month" copy update immediately.
      applyDownloadUsage(response.data ?? {});

      return response.data;
    } catch (error: any) {
      const payload = error?.data ?? error?.response?.data;
      // TOKEN_EXPIRED reaches here once base.api has tried a refresh, so by this
      // point it usually means the same thing to the user as AUTH_REQUIRED: sign
      // in again. Not when the refresh never got an answer, though - the session
      // may be fine, and telling someone to sign in over a dropped request both
      // loses their place and holds the queue for something that would retry.
      const refreshUnavailable =
        error?.refreshOutcome === 'unavailable' || error?.refreshOutcome === 'offline';
      if (
        payload?.code === 'AUTH_REQUIRED' ||
        (payload?.code === 'TOKEN_EXPIRED' && !refreshUnavailable)
      ) {
        throw new DownloadAuthRequiredError('Sign in to download this lecture.');
      }
      if (payload?.code === 'DOWNLOAD_LIMIT_REACHED') {
        applyDownloadUsage(payload);
        throw new DownloadLimitReachedError(
          payload.message ?? 'Free download limit reached for this month.',
          Number(payload.download_count ?? 0),
          Number(payload.free_download_limit ?? 0),
        );
      }
      console.error('❌ Download API failed for lecid:', lecid);
      console.error('Error details:', error);
      throw error;
    }
  }
}

export const downloadsApi = new DownloadsApiService();
