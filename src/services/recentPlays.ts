import api, { API_ENDPOINTS } from './api';
import { RecentPlay } from '../types/types';
import { getRecentLectures } from './media';

/**
 * Get recent plays for a user
 * @param userId - The user ID
 * @returns Promise<RecentPlay[]> - Array of recent plays
 */
export const getRecentPlays = async (userId: string): Promise<RecentPlay[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.RECENT_PLAYS_PHP, {
      params: {
        user_id: userId,
        action: 'get_recent'
      }
    });

    // Transform the response to match our RecentPlay interface
    // The API returns an array with a single object containing user_id and data
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.warn('Unexpected response format for recent plays:', response.data);
      return [];
    }

    const recentPlayData = response.data[0];
    if (!recentPlayData.data) {
      console.warn('No recent play data found');
      return [];
    }

    // The data object contains episode IDs as keys and timestamps as values
    const episodeIds = Object.keys(recentPlayData.data);
    if (episodeIds.length === 0) {
      return [];
    }

    // Fetch actual episode details from the recent lectures API
    try {
      const allLectures = await getRecentLectures(1); // Get first page of recent lectures

      // Match episode IDs with actual lecture data
      return episodeIds.map((episodeId: string) => {
        const lecture = allLectures.find(lec => lec.id === episodeId);

        return {
          episode: lecture ? {
            id: lecture.id,
            title: lecture.title,
            durationSec: lecture.durationSec,
            coverUrl: lecture.coverUrl,
            audioUrl: lecture.audioUrl,
            videoUrl: lecture.videoUrl || '',
            seriesId: lecture.seriesId,
            plays: lecture.plays,
            liked: lecture.liked,
            language: lecture.language,
            downloads: lecture.downloads,
            createdAt: lecture.createdAt
          } : {
            // Fallback if lecture not found in recent lectures
            id: episodeId,
            title: `Episode ${episodeId}`,
            durationSec: 0,
            coverUrl: '',
            audioUrl: '',
            videoUrl: '',
            seriesId: '',
            plays: 0,
            liked: false,
            language: 'en',
            downloads: 0,
            createdAt: ''
          },
          lastPlayedAt: recentPlayData.data[episodeId]?.toString() || '',
          progress: 0
        };
      });
    } catch (lectureError) {
      console.warn('Failed to fetch lecture details, using placeholder data:', lectureError);

      // Fallback to placeholder data if lecture fetch fails
      return episodeIds.map((episodeId: string) => ({
        episode: {
          id: episodeId,
          title: `Episode ${episodeId}`,
          durationSec: 0,
          coverUrl: '',
          audioUrl: '',
          videoUrl: '',
          seriesId: '',
          plays: 0,
          liked: false,
          language: 'en',
          downloads: 0,
          createdAt: ''
        },
        lastPlayedAt: recentPlayData.data[episodeId]?.toString() || '',
        progress: 0
      }));
    }
  } catch (error) {
    console.error('Error fetching recent plays:', error);
    throw error;
  }
};

/**
 * Log a recent play entry
 * @param userId - The user ID
 * @param audioId - The audio/episode ID
 * @returns Promise<void>
 */
export const logRecentPlay = async (userId: string, audioId: string): Promise<void> => {
  try {
    await api.post(API_ENDPOINTS.RECENT_PLAYS_PHP, {
      action: 'post_recent',
      audio_id: audioId,
      user_id: userId
    });

    console.log(`Successfully logged recent play: user ${userId}, audio ${audioId}`);
  } catch (error) {
    console.error('Error logging recent play:', error);
    throw error;
  }
};

/**
 * Add or update a recent play entry
 * Note: This would be a POST/PUT endpoint if available
 * For now, this is a placeholder for future implementation
 */
export const addRecentPlay = async (userId: string, episodeId: string, progress?: number): Promise<void> => {
  // This would typically be a POST request to record a play
  // Since the API details weren't provided, this is a placeholder
  console.log(`Recording recent play: user ${userId}, episode ${episodeId}, progress ${progress}`);

  // TODO: Implement when API endpoint is available
  // await api.post('/recentApi.php', {
  //   user_id: userId,
  //   episode_id: episodeId,
  //   progress,
  //   action: 'add_recent'
  // });
};
