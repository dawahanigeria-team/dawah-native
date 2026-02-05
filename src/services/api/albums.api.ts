/**
 * Albums API Service
 * Handles all album-related API calls
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';

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
   * Uses: https://backend.dawahbox.com/api/albumlisting_rp.php?offset=30&lim=10&page=1&rpid=10
   */
  async getAlbumsByLecturer(
    lecturerId: string,
    page = 1,
    limit = 10
  ): Promise<{ data: Album[]; total: number; total_pages: number }> {
    try {
      console.log('📀 Fetching albums for lecturer:', lecturerId, 'Page:', page);

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      addSentryBreadcrumb('Fetching albums by lecturer', 'http', {
        lecturerId,
        page,
        limit,
        offset,
        endpoint: API_CONFIG.ENDPOINTS.ALBUMS_BY_LECTURER,
      });

      // Use the correct endpoint for albums by lecturer
      const response = await apiClient.get<any>(
        API_CONFIG.ENDPOINTS.ALBUMS_BY_LECTURER,
        {
          rpid: lecturerId,
          offset,
          lim: limit,
          page,
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

      addSentryBreadcrumb('Albums by lecturer loaded successfully', 'info', {
        lecturerId,
        albumCount: albums.length,
        page,
        total: response.total || albums.length,
      });

      return {
        data: albums,
        total: response.total || albums.length,
        total_pages: response.total_pages || Math.ceil((response.total || albums.length) / limit),
      };
    } catch (error) {
      console.error('Failed to fetch albums by lecturer:', error);

      captureSentryException(error, {
        service: 'AlbumsApiService',
        action: 'getAlbumsByLecturer',
        lecturerId,
        page,
        limit,
        level: 'error',
      });

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

      addSentryBreadcrumb('Fetching album details', 'http', {
        albumId,
        endpoint: '/api/albumapi3.php',
      });

      const response = await apiClient.get<any>(
        '/api/albumapi3.php',
        {
          aid: albumId,
          page: 1,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
        }
      );

      // API returns array of lectures directly
      const lecturesArray = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []);

      if (lecturesArray.length === 0) {
        throw new ApiError('No tracks found in album', 404);
      }

      // Extract album info from first lecture (all have same album info)
      const firstLecture = lecturesArray[0];
      const album: Album = {
        id: albumId,
        title: firstLecture.album_name || 'Untitled Album',
        coverUrl: firstLecture.lec_img || firstLecture.mp3_thumbnail,
        lecturerId: String(firstLecture.rp_id || ''),
        lecturerName: firstLecture.rp || firstLecture.rp_name,
        trackCount: lecturesArray.length,
        plays: 0, // Not provided in response
        language: undefined, // Not provided in response
      };

      // Normalize lectures as tracks
      const tracks = this.normalizeAlbumTracks(lecturesArray);

      console.log('✅ Album details fetched:', {
        album: album.title,
        tracks: tracks.length,
      });

      addSentryBreadcrumb('Album details loaded successfully', 'info', {
        albumId,
        albumTitle: album.title,
        trackCount: tracks.length,
      });

      return { album, tracks };
    } catch (error) {
      console.error('Failed to fetch album details:', error);

      captureSentryException(error, {
        service: 'AlbumsApiService',
        action: 'getAlbumDetails',
        albumId,
        level: 'error',
      });

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

      addSentryBreadcrumb('Fetching album tracks', 'http', {
        albumId,
        page,
        endpoint: API_CONFIG.ENDPOINTS.ALBUM_TRACKS,
      });

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

      addSentryBreadcrumb('Album tracks loaded successfully', 'info', {
        albumId,
        trackCount: tracks.length,
        page,
      });

      return {
        data: tracks,
        total: response.total || tracks.length,
      };
    } catch (error) {
      console.error('Failed to fetch album tracks:', error);

      captureSentryException(error, {
        service: 'AlbumsApiService',
        action: 'getAlbumTracks',
        albumId,
        page,
        level: 'error',
      });

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
      id: String(album.aid || album.id || album.album_id || album.nid),
      title: album.album_name || album.title || album.name || 'Untitled Album',
      coverUrl: album.album_cover || album.coverUrl || album.alb_thumbnail || album.img,
      lecturerId: String(album.rp_id || album.lecturerId || ''),
      lecturerName: album.rp_name || album.lecturerName || album.lecturer,
      language: album.lang || album.language,
      trackCount: parseInt(String(album.total_tracks || album.trackCount || album.lec_no || '0')),
      totalDuration: album.total_duration || album.totalDuration,
      plays: parseInt(String(album.views || album.plays || '0')),
      tags: album.tags || [],
      description: album.description || album.desc,
      createdAt: album.created_at || album.createdAt || album.post_date,
    };
  }

  /**
   * Normalize album tracks from API response
   */
  private normalizeAlbumTracks(tracks: any[]): AlbumTrack[] {
    if (!Array.isArray(tracks)) return [];

    return tracks.map((track, index) => ({
      id: String(track.id || track.nid || track.track_id || `track-${index}`),
      title: track.title || track.lectitle || track.mp3_title || track.Title || 'Untitled Track',
      duration: track.duration || track.mp3_duration || track.Duration || '00:00',
      audioUrl: track.audio || track.mp3_url || track.audioUrl || '',
      trackNumber: track.track_number || track.trackNumber || index + 1,
      plays: parseInt(String(track.views || track.plays || track.favorites || track.Plays || '0')),
      albumId: String(track.album_id || track.albumId || ''),
    }));
  }
}

// Export singleton instance
export const albumsApi = new AlbumsApiService();
