/**
 * Downloads API Service
 * Handles download counter increments via backend
 */

import { apiClient } from './base.api';

export interface DownloadApiResponse {
  _id: string;
  lecid: string;
  url: string;
  title: string;
  downloads?: number;
  [key: string]: any; // Other MP3 metadata fields
}

class DownloadsApiService {
  /**
   * Increment download counter and get MP3 metadata
   * This MUST be called before downloading a lecture
   */
  async incrementDownloadCounter(lecid: string): Promise<DownloadApiResponse> {
    try {
      console.log('📤 Sending to download API:', { lecid });
      const response = await apiClient.post<DownloadApiResponse>('/api/download_api.php', {
        lecid,
      });

      console.log('✅ Download API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Download API failed for lecid:', lecid);
      console.error('Error details:', error);
      throw error;
    }
  }
}

export const downloadsApi = new DownloadsApiService();
