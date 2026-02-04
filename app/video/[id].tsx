/**
 * Video Player Screen
 * Displays a YouTube video with details and controls
 */

import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";
import { videoApi } from "../../src/services/api/video.api";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Video } from "../../src/types/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PLAYER_HEIGHT = (SCREEN_WIDTH * 9) / 16; // 16:9 aspect ratio

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  /**
   * Fetch video details
   */
  const fetchVideoDetail = useCallback(async () => {
    if (!id) {
      setError("Video ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🎥 Fetching video detail for ID:", id);
      const response = await videoApi.getVideoDetail({ id });

      // Transform API response to Video type
      const apiVideo = response.data;

      // API can return either youtube_url or youtubekey
      const youtubeKey = apiVideo.youtubekey || apiVideo.youtube_id;
      const youtubeUrl = apiVideo.youtube_url || (youtubeKey ? `https://www.youtube.com/watch?v=${youtubeKey}` : undefined);

      // Extract YouTube ID - if we have youtubeKey directly, use it
      let youtubeId = youtubeKey;
      if (!youtubeId && youtubeUrl) {
        youtubeId = videoApi.extractYouTubeId(youtubeUrl);
      }

      if (!youtubeId) {
        throw new Error("Invalid YouTube URL or ID");
      }

      // Parse duration
      const parseDuration = (duration: string | undefined): number => {
        if (!duration) return 0;
        const parts = duration.split(":").map(Number);
        if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          return parts[0] * 60 + parts[1];
        }
        return 0;
      };

      const transformedVideo: Video = {
        id: apiVideo.id || apiVideo.nid?.toString() || id,
        title: apiVideo.title || apiVideo.Title || "Untitled Video",
        youtubeUrl: youtubeUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
        youtubeId,
        thumbnailUrl:
          apiVideo.images ||
          apiVideo.thumbnail ||
          apiVideo.img ||
          `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        description: apiVideo.description,
        duration: apiVideo.duration || apiVideo.Duration,
        durationSec: parseDuration(apiVideo.duration || apiVideo.Duration),
        views:
          typeof apiVideo.views === "number"
            ? apiVideo.views
            : parseInt(String(apiVideo.views || apiVideo.Plays || "0")) || 0,
        likes:
          typeof apiVideo.likes === "number"
            ? apiVideo.likes
            : parseInt(String(apiVideo.likes || apiVideo.favorites || "0")) || 0,
        createdAt: apiVideo.created_at || apiVideo.CreatedAt || apiVideo.post_date || "",
        lecturerName: apiVideo.author || apiVideo.lecturer_name || apiVideo.rpname,
        language: apiVideo.language || apiVideo.lang,
      };

      setVideo(transformedVideo);
      console.log("✅ Video detail fetched successfully:", transformedVideo.title);
    } catch (err: any) {
      console.error("❌ Error fetching video detail:", err);
      setError(err.message || "Failed to load video");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVideoDetail();
  }, [fetchVideoDetail]);

  /**
   * Handle player state change
   */
  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    } else if (state === "playing") {
      setPlaying(true);
    } else if (state === "paused") {
      setPlaying(false);
    }
  }, []);

  /**
   * Format numbers with K, M suffixes
   */
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <SafeAreaView
        style={[tw`flex-1`, { backgroundColor: designTokens.colors.system.background.primary }]}
      >
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
          <Text
            style={[
              tw`mt-4`,
              {
                color: designTokens.colors.system.label.secondary,
                fontSize: designTokens.typography.fontSize.body,
              },
            ]}
          >
            Loading video...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render error state
   */
  if (error || !video) {
    return (
      <SafeAreaView
        style={[tw`flex-1`, { backgroundColor: designTokens.colors.system.background.primary }]}
      >
        {/* Header */}
        <View style={tw`px-4 py-3 flex-row items-center`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-4`}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={designTokens.colors.system.label.primary}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: designTokens.typography.fontSize.title3,
              fontWeight: designTokens.typography.fontWeight.semibold,
              color: designTokens.colors.system.label.primary,
            }}
          >
            Video
          </Text>
        </View>

        {/* Error Message */}
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={designTokens.colors.system.label.tertiary}
          />
          <Text
            style={[
              tw`mt-4 text-center`,
              {
                color: designTokens.colors.system.label.primary,
                fontSize: designTokens.typography.fontSize.title3,
                fontWeight: designTokens.typography.fontWeight.semibold,
              },
            ]}
          >
            Failed to Load Video
          </Text>
          <Text
            style={[
              tw`mt-2 text-center`,
              {
                color: designTokens.colors.system.label.secondary,
                fontSize: designTokens.typography.fontSize.body,
              },
            ]}
          >
            {error || "Video not found"}
          </Text>
          <TouchableOpacity
            onPress={fetchVideoDetail}
            style={[
              tw`mt-6 px-6 py-3 rounded-full`,
              { backgroundColor: designTokens.colors.brand.primary },
            ]}
          >
            <Text
              style={{
                color: designTokens.colors.fixed.black,
                fontSize: designTokens.typography.fontSize.body,
                fontWeight: designTokens.typography.fontWeight.semibold,
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render video player and details
   */
  return (
    <SafeAreaView
      style={[tw`flex-1`, { backgroundColor: designTokens.colors.system.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={tw`px-4 py-3 flex-row items-center`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`mr-4`}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.system.label.primary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: designTokens.typography.fontSize.title3,
            fontWeight: designTokens.typography.fontWeight.semibold,
            color: designTokens.colors.system.label.primary,
          }}
        >
          Video
        </Text>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* YouTube Player */}
        <View
          style={{
            width: SCREEN_WIDTH,
            height: PLAYER_HEIGHT,
            backgroundColor: designTokens.colors.fixed.black,
          }}
        >
          <YoutubePlayer
            height={PLAYER_HEIGHT}
            width={SCREEN_WIDTH}
            play={playing}
            videoId={video.youtubeId}
            onChangeState={onStateChange}
            webViewStyle={{ opacity: 0.99 }} // Fix for Android
          />
        </View>

        {/* Video Details */}
        <View style={tw`px-4 py-4`}>
          {/* Title */}
          <Text
            style={{
              fontSize: designTokens.typography.fontSize.title2,
              fontWeight: designTokens.typography.fontWeight.bold,
              color: designTokens.colors.system.label.primary,
              lineHeight: designTokens.typography.fontSize.title2 * 1.3,
            }}
          >
            {video.title}
          </Text>

          {/* Metadata Row */}
          <View style={tw`flex-row items-center mt-2 flex-wrap`}>
            {video.views > 0 && (
              <>
                <Text
                  style={{
                    fontSize: designTokens.typography.fontSize.subheadline,
                    color: designTokens.colors.system.label.secondary,
                  }}
                >
                  {formatCount(video.views)} views
                </Text>
                <View
                  style={[
                    tw`mx-2`,
                    {
                      width: 3,
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor: designTokens.colors.system.label.tertiary,
                    },
                  ]}
                />
              </>
            )}
            {video.lecturerName && (
              <>
                <Text
                  style={{
                    fontSize: designTokens.typography.fontSize.subheadline,
                    color: designTokens.colors.system.label.secondary,
                  }}
                >
                  {video.lecturerName}
                </Text>
                <View
                  style={[
                    tw`mx-2`,
                    {
                      width: 3,
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor: designTokens.colors.system.label.tertiary,
                    },
                  ]}
                />
              </>
            )}
            {video.language && (
              <Text
                style={{
                  fontSize: designTokens.typography.fontSize.subheadline,
                  color: designTokens.colors.system.label.secondary,
                }}
              >
                {video.language}
              </Text>
            )}
          </View>

          {/* Description */}
          {video.description && (
            <View
              style={[
                tw`mt-4 p-4 rounded-xl`,
                { backgroundColor: designTokens.colors.system.background.secondary },
              ]}
            >
              <Text
                style={{
                  fontSize: designTokens.typography.fontSize.body,
                  color: designTokens.colors.system.label.primary,
                  lineHeight: designTokens.typography.fontSize.body * 1.5,
                }}
              >
                {video.description}
              </Text>
            </View>
          )}

          {/* Action Buttons - Placeholder for future features */}
          <View style={tw`flex-row items-center mt-6 gap-3`}>
            <TouchableOpacity
              style={[
                tw`flex-1 flex-row items-center justify-center py-3 rounded-full`,
                { backgroundColor: designTokens.colors.system.background.secondary },
              ]}
            >
              <Ionicons
                name="heart-outline"
                size={20}
                color={designTokens.colors.system.label.primary}
              />
              <Text
                style={[
                  tw`ml-2`,
                  {
                    color: designTokens.colors.system.label.primary,
                    fontSize: designTokens.typography.fontSize.subheadline,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                  },
                ]}
              >
                Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-1 flex-row items-center justify-center py-3 rounded-full`,
                { backgroundColor: designTokens.colors.system.background.secondary },
              ]}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color={designTokens.colors.system.label.primary}
              />
              <Text
                style={[
                  tw`ml-2`,
                  {
                    color: designTokens.colors.system.label.primary,
                    fontSize: designTokens.typography.fontSize.subheadline,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                  },
                ]}
              >
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
