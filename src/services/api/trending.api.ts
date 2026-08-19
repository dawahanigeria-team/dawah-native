/**
 * Trending Lectures API Service
 *
 * Thin compatibility shim. All trending data now flows through
 * `recentApi.getTrendingLectures()` (velocity-scored across a recency
 * window over a merged, multi-language dataset).
 *
 * The previous implementation hit /api/popular_lec_api.php, which
 * returns lifetime-popular lectures with no date field — meaning
 * "trending" silently surfaced years-old content. This shim is kept so
 * existing callers (`useTrending` hook, /section/trending route) do not
 * need import-site changes.
 */

import {
  recentApi,
  RecentLecturesResponse,
  type RecentLecturesParams,
} from './recent.api';
import { SearchLecture } from '../../types/api.types';

export type TrendingLecturesParams = RecentLecturesParams & { enabled?: boolean };

export type TrendingLecturesResponse = RecentLecturesResponse;

class TrendingLecturesApiService {
  async getTrendingLectures(
    params: TrendingLecturesParams = {},
  ): Promise<TrendingLecturesResponse> {
    const { enabled: _enabled, ...requestParams } = params;
    return recentApi.getTrendingLectures(requestParams);
  }

  async getTrendingForCarousel(limit = 10): Promise<SearchLecture[]> {
    const response = await recentApi.getTrendingLectures({ page: 1, limit });
    return response.data.slice(0, limit);
  }

  clearCache(): void {
    recentApi.clearCache();
  }
}

export const trendingApi = new TrendingLecturesApiService();
