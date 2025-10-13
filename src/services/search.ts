import api, { API_ENDPOINTS } from './api';
import { Lecturer, SearchResultItem, Episode } from '../types/types';

export interface SearchLecturesResponse {
  success: boolean;
  data: Lecturer[];
  total?: number;
  message?: string;
}

export interface SearchAllContentResponse {
  success: boolean;
  data: SearchResultItem[];
  total?: number;
  message?: string;
}

/**
 * Search for lectures by title or content
 * @param searchTerm - The search term to look for
 * @returns Promise<Episode[]>
 */
export const searchLectures = async (searchTerm: string): Promise<Episode[]> => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Search term is required');
    }

    const response = await api.get(API_ENDPOINTS.SEARCH_LECTURES, {
      params: {
        type: 'lectures',
        value: searchTerm.trim(),
      },
    });

    console.log('Search lectures response:', response.data);

    // Handle different response formats
    let lecturesData: any[] = [];
    if (response.data.success && response.data.data) {
      lecturesData = response.data.data;
    } else if (Array.isArray(response.data)) {
      // If response is directly an array
      lecturesData = response.data;
    } else {
      console.warn('Unexpected response format:', response.data);
      return [];
    }

    // Map to Episode format
    return lecturesData.map((item: any): Episode => ({
      id: item.id?.toString() || item.nid?.toString() || '',
      title: item.mp3_title || item.title || '',
      durationSec: parseDurationToSeconds(item.mp3_duration || item.duration || '0:00'),
      coverUrl: item.mp3_thumbnail || item.lecturer_image || item.img || '',
      audioUrl: item.mp3_url || item.audio_url || '',
      seriesId: item.album_id?.toString() || item.series_id?.toString() || '',
      plays: item.views || item.plays || 0,
      liked: item.liked || false,
      language: item.language_name || item.lang || 'English',
      downloads: item.downloads || item.download || 0,
      createdAt: item.updated_date || item.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Search lectures failed:', error);
    throw error;
  }
};

/**
 * Search across all content types (episodes, lecturers, series, categories)
 * @param searchTerm - The search term to look for
 * @returns Promise<Episode[]>
 */
export const searchAllContent = async (searchTerm: string): Promise<Episode[]> => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Search term is required');
    }

    const response = await api.get(API_ENDPOINTS.SEARCH_ALL_CONTENT, {
      params: {
        type: 'all',
        value: searchTerm.trim(),
      },
    });

    console.log('Search all content response:', response.data);

    // Handle different response formats
    let contentData: any[] = [];
    if (response.data.success && response.data.data) {
      contentData = response.data.data;
    } else if (Array.isArray(response.data)) {
      // If response is directly an array
      contentData = response.data;
    } else {
      console.warn('Unexpected response format:', response.data);
      return [];
    }

    // Map to Episode format (since all content is audio-related)
    return contentData.map((item: any): Episode => ({
      id: item.id?.toString() || item.nid?.toString() || '',
      title: item.mp3_title || item.title || '',
      durationSec: parseDurationToSeconds(item.mp3_duration || item.duration || '0:00'),
      coverUrl: item.mp3_thumbnail || item.lecturer_image || item.img || '',
      audioUrl: item.mp3_url || item.audio_url || '',
      seriesId: item.album_id?.toString() || item.series_id?.toString() || '',
      plays: item.views || item.plays || 0,
      liked: item.liked || false,
      language: item.language_name || item.lang || 'English',
      downloads: item.downloads || item.download || 0,
      createdAt: item.updated_date || item.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Search all content failed:', error);
    throw error;
  }
};

// Helper function to parse duration string to seconds
const parseDurationToSeconds = (durationStr: string): number => {
  if (!durationStr || durationStr === '0') return 0;

  // Handle formats like "00:47:49" or "0:47:49"
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  return 0;
};
