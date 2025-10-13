import api from './api';
import { SliderImage, Episode, Series } from '../types/types';

/**
 * Parse duration string (H:MM:SS or MM:SS) to seconds
 * @param durationStr Duration string
 * @returns Number of seconds
 */
const parseDuration = (durationStr: string): number => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

/**
 * Get slider images for hero carousel or banners
 * @returns Promise<SliderImage[]>
 */
export const getSliderImages = async (): Promise<SliderImage[]> => {
  try {
    const response = await api.get<string[]>('/slider_image.php');

    console.log('Slider images response:', response.data);

    // API returns direct array of image URLs
    if (Array.isArray(response.data)) {
      return response.data.map((url: string, index: number): SliderImage => ({
        id: index.toString(),
        title: '',
        imageUrl: url,
        link: '',
      }));
    } else {
      console.warn('Unexpected response format:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Get slider images failed:', error);
    throw error;
  }
};

/**
 * Get recent lectures
 * @param page Page number (default: 1)
 * @returns Promise<Episode[]>
 */
export const getRecentLectures = async (page: number = 1): Promise<Episode[]> => {
  try {
    // Use the correct endpoint for recent lectures
    const response = await api.get('/leclisting_recent.php', {
      params: {
        action: 'get_recent_audio',
        page,
      },
    });

    console.log('Recent lectures response:', response.data);

    // Parse the response data
    if (Array.isArray(response.data)) {
      return response.data.map((item: any): Episode => ({
        id: item.nid?.toString() || item.id?.toString() || '',
        title: item.mp3_title || item.title || '',
        durationSec: parseDuration(item.mp3_duration) || 0,
        coverUrl: item.mp3_thumbnail || item.img || item.cover_url || '',
        audioUrl: item.mp3_url || item.audio_url || '',
        seriesId: item.album_id?.toString() || item.series_id?.toString() || '',
        plays: item.views || item.plays || 0,
        liked: item.liked || false,
        language: item.lang || item.language || 'English',
        downloads: item.download || item.downloads || 0,
        createdAt: item.updated_date || item.created_at || '',
      }));
    } else {
      console.warn('Unexpected response format for recent lectures:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch recent lectures:', error);
    return [];
  }
};

/**
 * Get trending lectures
 * @param langid Language ID (default: 6)
 * @param page Page number (default: 1)
 * @param limit Number of items per page (default: 20)
 * @returns Promise<Episode[]>
 */
export const getTrendingLectures = async (langid: number = 6, page: number = 1, limit: number = 20): Promise<Episode[]> => {
  try {
    // Use the correct endpoint for trending/popular lectures
    const response = await api.get('/popular_lec_api.php', {
      params: {
        langid,
        page,
        lim: limit, // Use 'lim' parameter for limit
      },
    });

    console.log('Trending lectures response:', response.data);

    // Parse the response data
    if (Array.isArray(response.data)) {
      return response.data.map((item: any): Episode => ({
        id: item.nid?.toString() || item.id?.toString() || '',
        title: item.Title || item.title || '',
        durationSec: parseDuration(item.duration) || 0,
        coverUrl: item.img || item.cover_url || '',
        audioUrl: item.audio || item.audio_url || '',
        seriesId: item.album_id?.toString() || item.series_id?.toString() || '',
        plays: item.views || item.plays || 0,
        liked: item.liked || false,
        language: item.lang || item.language || 'English',
        downloads: item.downloads || item.download || 0,
        createdAt: item.updated_date || item.created_at || '',
      }));
    } else {
      console.warn('Unexpected response format for trending lectures:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch trending lectures:', error);
    return [];
  }
};

/**
 * Get featured lectures (albums/series)
 * @param langid Language ID (default: 7)
 * @param page Page number (default: 1)
 * @param limit Number of items per page (default: 10)
 * @returns Promise<Series[]>
 */
export const getFeaturedLectures = async (langid: number = 7, page: number = 1, limit: number = 10): Promise<Series[]> => {
  try {
    const response = await api.get('/albumlisting_page_api.php', {
      params: {
        langid,
        page,
        lim: limit,
      },
    });

    console.log('Featured lectures response:', response.data);

    // Parse the response data
    if (Array.isArray(response.data)) {
      return response.data.map((item: any): Series => ({
        id: item.nid?.toString() || item.id?.toString() || '',
        title: item.title || '',
        coverUrl: item.img || item.alb_thumbnail || '',
        language: item.lang || 'English',
        tags: item.categories ? item.categories.split(',').map((cat: string) => cat.trim()) : [],
        lecturerId: item.lec_no?.toString() || '',
      }));
    } else {
      console.warn('Unexpected response format for featured lectures:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch featured lectures:', error);
    return [];
  }
};

/**
 * Get lectures by language
 * @param langid Language ID (default: 6)
 * @param page Page number (default: 1)
 * @returns Promise<Episode[]>
 */
export const getLecturesByLanguage = async (langid: number = 6, page: number = 1): Promise<Episode[]> => {
  try {
    const response = await api.get('/leclisting_lang.php', {
      params: {
        langid,
        page,
      },
    });

    console.log('Language lectures response:', response.data);

    // Parse the response data
    if (Array.isArray(response.data)) {
      return response.data.map((item: any): Episode => ({
        id: item.nid?.toString() || item.id?.toString() || '',
        title: item.mp3_title || item.title || '',
        durationSec: parseDuration(item.mp3_duration) || 0,
        coverUrl: item.mp3_thumbnail || item.img || item.cover_url || '',
        audioUrl: item.mp3_url || item.audio_url || '',
        seriesId: item.album_id?.toString() || item.series_id?.toString() || '',
        plays: item.views || item.plays || 0,
        liked: item.liked || false,
        language: item.lang || item.language || 'English',
        downloads: item.download || item.downloads || 0,
        createdAt: item.updated_date || item.created_at || '',
      }));
    } else {
      console.warn('Unexpected response format for language lectures:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch lectures by language:', error);
    return [];
  }
};


