import {
  AddToPlaylistRequest,
  AddToPlaylistResponse,
  CreatePlaylistRequest,
  CreatePlaylistResponse,
  PlaylistDataResponse,
  UserPlaylistsResponse,
} from "../../types/api.types";
import {
  addSentryBreadcrumb,
  captureSentryException,
} from "../config/sentry.config";
import { userService } from "../user.service";
import { apiClient, ApiError } from "./base.api";

class PlaylistApiService {
  private async getUserId(): Promise<string> {
    return await userService.getUserId();
  }

  async createPlaylist(
    name: string,
    isPrivate: boolean
  ): Promise<CreatePlaylistResponse> {
    try {
      const userId = await this.getUserId();
      const request: CreatePlaylistRequest = {
        action: "create_playlist",
        name,
        is_private: isPrivate ? 1 : 0,
        user_id: userId,
      };

      addSentryBreadcrumb("Creating playlist", "user", { name, isPrivate });

      const response = await apiClient.post<CreatePlaylistResponse>(
        "/api/playlistApi.php",
        request
      );

      console.log("✅ Playlist created successfully:", response.data);

      // Clear cache for user playlists to ensure the list is refreshed
      await apiClient.clearCache("user_playlists");

      return response.data;
    } catch (error) {
      console.error("❌ Failed to create playlist:", error);
      captureSentryException(error as Error, {
        component: "PlaylistApiService",
        action: "createPlaylist",
        name,
      });

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Failed to create playlist", undefined, error);
    }
  }

  async addAudioToPlaylist(
    playlistId: string,
    audioId: string,
    action: "add_playlist_audio" = "add_playlist_audio"
  ): Promise<AddToPlaylistResponse> {
    try {
      const userId = await this.getUserId();
      const request: AddToPlaylistRequest = {
        action,
        user_id: userId,
        audio_id: audioId,
        playlist_id: playlistId,
      };

      addSentryBreadcrumb("Adding audio to playlist", "user", {
        playlistId,
        audioId,
      });

      const response = await apiClient.post<AddToPlaylistResponse>(
        "/api/playlistApi.php",
        request
      );

      console.log("✅ Audio added to playlist successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to add audio to playlist:", error);
      captureSentryException(error as Error, {
        component: "PlaylistApiService",
        action: "addAudioToPlaylist",
        playlistId,
        audioId,
      });

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Failed to add audio to playlist", undefined, error);
    }
  }

  async getUserPlaylists(): Promise<UserPlaylistsResponse> {
    let userId: string | undefined;
    try {
      userId = await this.getUserId();
      const params = {
        action: "user_playlists",
        user_id: userId,
      };

      addSentryBreadcrumb("Fetching user playlists", "user", { userId });

      const response = await apiClient.get<UserPlaylistsResponse>(
        "/api/playlistApi.php",
        params
      );

      console.log("✅ User playlists fetched successfully:", response.data);
      return { ...response.data, playlists: response.data.data || [] };
    } catch (error) {
      console.error("❌ Failed to fetch user playlists:", error);
      captureSentryException(error as Error, {
        component: "PlaylistApiService",
        action: "getUserPlaylists",
        userId,
      });

      if (error instanceof ApiError) {
        // Enhance error with more context
        if (
          error.statusCode === 400 &&
          error.data?.message?.includes("Invalid user ID")
        ) {
          throw new ApiError(
            "Authentication required. Please log in to access your playlists.",
            error.statusCode,
            error.data
          );
        }
        if (error.isNetworkError) {
          throw new ApiError(
            "No internet connection. Please check your network and try again.",
            error.statusCode,
            error.data,
            true
          );
        }
        throw error;
      }
      throw new ApiError("Failed to fetch user playlists", undefined, error);
    }
  }

  async getPlaylistData(playlistId: string): Promise<PlaylistDataResponse> {
    try {
      const userId = await this.getUserId();
      const params = {
        action: "playlist_data",
        user_id: userId,
        playlist_id: playlistId,
      };

      addSentryBreadcrumb("Fetching playlist data", "user", {
        userId,
        playlistId,
      });

      const response = await apiClient.get<PlaylistDataResponse>(
        "/api/playlistApi.php",
        params
      );

      console.log("✅ Playlist data fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to fetch playlist data:", error);
      captureSentryException(error as Error, {
        component: "PlaylistApiService",
        action: "getPlaylistData",
        playlistId,
      });

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Failed to fetch playlist data", undefined, error);
    }
  }
}

export const playlistApi = new PlaylistApiService();
