/**
 * Albums API Service
 * Handles all album-related API calls
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { SearchAlbum } from '../../types/api.types';

export interface Album {
  id: string | number;
  title: string;
  coverUrl?: string;
  lecturerId?: string;
  lecturerName?: string;
  lecturer?: string;
  language?: string;
  trackCount?: number;
  totalDuration?: string;
  plays?: number;
  tags?: string[];
  description?: string;
  createdAt?: string;
  // Additional fields from API
  aid?: string | number;
  album_name?: string;
  album_cover?: string;
  rp_id?: string;
  rp_name?: string;
  total_tracks?: number;
  total_duration?: string;
  lang?: string;
  views?: number;
}

export interface AlbumTrack {
  id: string | number;
  title: string;
  duration: string;
  audioUrl: string;
  trackNumber?: number;
  plays?: number;
  albumId?: string;
}

export interface AlbumsParams {
  page?: number;
  limit?: number;
  lecturerId?: string;
  language?: string;
}

class AlbumsApiService {
  /**
   * Get albums by lecturer
   */
  async getAlbumsByLecturer(
    lecturerId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: Album[]; total: number; total_pages: number }> {
    try {
      console.log('📀 Fetching albums for lecturer:', lecturerId);

      // The API endpoint might need to be adjusted based on actual backend
      const response = await apiClient.get<any>(
        API_CONFIG.ENDPOINTS.ALBUMS,
        {
          rp_id: lecturerId,
          page,
          limit,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
        }
      );

      // Normalize the response
      const albums = this.normalizeAlbumsResponse(response.data);

      console.log('✅ Albums fetched:', albums.length);

      return {
        data: albums,
        total: response.total || albums.length,
        total_pages: response.total_pages || Math.ceil((response.total || albums.length) / limit),
      };
    } catch (error) {
      console.error('Failed to fetch albums by lecturer:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch albums', undefined, error);
    }
  }

  /**
   * Get album details with tracks
   */
  async getAlbumDetails(albumId: string): Promise<{
    album: Album;
    tracks: AlbumTrack[];
  }> {
    try {
      console.log('📀 Fetching album details:', albumId);

      const response = await apiClient.get<any>(
        '/api/albumapi3.php',
        {
          aid: albumId,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
        }
      );

      // Extract album info and tracks
      const album = this.normalizeAlbum(response.album || response.data);
      const tracks = this.normalizeAlbumTracks(response.tracks || response.data?.tracks || []);

      console.log('✅ Album details fetched:', {
        album: album.title,
        tracks: tracks.length,
      });

      return { album, tracks };
    } catch (error) {
      console.error('Failed to fetch album details:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch album details', undefined, error);
    }
  }

  /**
   * Get album tracks
   */
  async getAlbumTracks(
    albumId: string,
    page = 1
  ): Promise<{ data: AlbumTrack[]; total: number }> {
    try {
      console.log('📀 Fetching album tracks:', albumId);

      const response = await apiClient.get<any>(
        API_CONFIG.ENDPOINTS.ALBUM_TRACKS,
        {
          aid: albumId,
          page,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
        }
      );

      const tracks = this.normalizeAlbumTracks(response.data || response.tracks || []);

      console.log('✅ Album tracks fetched:', tracks.length);

      return {
        data: tracks,
        total: response.total || tracks.length,
      };
    } catch (error) {
      console.error('Failed to fetch album tracks:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch album tracks', undefined, error);
    }
  }

  /**
   * Normalize albums response from API
   */
  private normalizeAlbumsResponse(data: any): Album[] {
    if (!data) return [];

    // Handle array response
    if (Array.isArray(data)) {
      return data.map(album => this.normalizeAlbum(album));
    }

    // Handle single album
    if (data.aid || data.id) {
      return [this.normalizeAlbum(data)];
    }

    // Handle nested data
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((album: any) => this.normalizeAlbum(album));
    }

    return [];
  }

  /**
   * Normalize single album from API response
   */
  private normalizeAlbum(album: any): Album {
    return {
      id: String(album.aid || album.id || album.album_id),
      title: album.album_name || album.title || 'Untitled Album',
      coverUrl: album.album_cover || album.coverUrl || album.img,
      lecturerId: String(album.rp_id || album.lecturerId || ''),
      lecturerName: album.rp_name || album.lecturerName || album.lecturer,
      language: album.lang || album.language,
      trackCount: parseInt(String(album.total_tracks || album.trackCount || '0')),
      totalDuration: album.total_duration || album.totalDuration,
      plays: parseInt(String(album.views || album.plays || '0')),
      tags: album.tags || [],
      description: album.description || album.desc,
      createdAt: album.created_at || album.createdAt,
    };
  }

  /**
   * Normalize album tracks from API response
   */
  private normalizeAlbumTracks(tracks: any[]): AlbumTrack[] {
    if (!Array.isArray(tracks)) return [];

    return tracks.map((track, index) => ({
      id: String(track.id || track.nid || track.track_id || `track-${index}`),
      title: track.title || track.mp3_title || track.Title || 'Untitled Track',
      duration: track.duration || track.mp3_duration || track.Duration || '00:00',
      audioUrl: track.audio || track.mp3_url || track.audioUrl || '',
      trackNumber: track.track_number || track.trackNumber || index + 1,
      plays: parseInt(String(track.views || track.plays || track.Plays || '0')),
      albumId: String(track.album_id || track.albumId || ''),
    }));
  }
}

// Export singleton instance
export const albumsApi = new AlbumsApiService();
