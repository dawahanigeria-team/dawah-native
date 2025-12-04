/**
 * World-Class Lecture Details Screen
 * Premium design with smooth animations and rich features
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Share,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Chip, Text, Touchable } from "../../src/components/atoms";
import AddToPlaylistModal from "../../src/components/organisms/AddToPlaylistModal";
import { useLectureDetail } from "../../src/hooks/useLectureDetail";
import { addSentryBreadcrumb, captureSentryException } from "../../src/services/config/sentry.config";
import { DownloadStatus } from "../../src/services/downloads/downloadQueue.service";
import { linkingService } from "../../src/services/linking.service";
import { useAuthStore, useDownloadsStore, useFavoritesStore, usePlayerStore } from "../../src/stores";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import type { LectureDetail } from "../../src/types/api.types";
import type { Episode } from "../../src/types/types";
import { appendShareSignature } from "../../src/utils/shareMessage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_HEIGHT = 420;

const createEpisodeFromDetail = (detail: LectureDetail | null): Episode | null => {
  if (!detail) return null;

  return {
    id: detail.id,
    title: detail.title,
    durationSec: detail.durationSec || 0,
    coverUrl: detail.coverUrl || "",
    audioUrl: detail.audioUrl || "",
    videoUrl: undefined,
    seriesId: detail.albumId || "",
    plays: detail.views || 0,
    liked: false,
    language: detail.language || "",
    downloads: detail.downloads || 0,
    createdAt: detail.postedDate || new Date().toISOString(),
    lecturerName: detail.lecturerName || "",
  };
};

const LectureDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lectureId = id ?? "";
  const { lecture, loading, error, refetch } = useLectureDetail(lectureId);
  const router = useRouter();

  const {
    playEpisode,
    togglePlayPause,
    currentEpisode,
    isPlaying,
    progress: currentProgress,
  } = usePlayerStore();

  const {
    addToQueue,
    getDownloadProgress,
    getDownloadStatus,
    pauseDownload,
    resumeDownload,
    cancelDownload,
  } = useDownloadsStore();

  const { isFavorited, toggleFavorite } = useFavoritesStore();

  const { isAuthenticated } = useAuthStore();

  // State management
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);

  // Check if lecture is liked
  const liked = isFavorited(lectureId);

  // Animation values
  const scrollY = useSharedValue(0);
  const likeScale = useSharedValue(1);

  const episode = useMemo(() => createEpisodeFromDetail(lecture), [lecture]);
  const isCurrentLecture = Boolean(
    lecture && currentEpisode?.id === lecture.id,
  );
  const canPlay = Boolean(episode?.audioUrl);
  const isCurrentlyPlaying = isCurrentLecture && isPlaying;

  // Download state

  const downloadStatus = episode ? getDownloadStatus(episode.id) : null;
  const downloadProgress = episode ? getDownloadProgress(episode.id) : 0;

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
      // Keep header elements (including back button) visible even at the top,
      // and slightly increase opacity as the user scrolls.
      [0.9, 0.95, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0, HEADER_HEIGHT],
      [1.5, 1, 0.8],
      Extrapolate.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [0, -HEADER_HEIGHT / 2],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  // Event handlers
  const handleScroll = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

  const handlePlayPress = useCallback(() => {
    if (!episode || !canPlay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // If this lecture is currently playing, toggle play/pause
    // Otherwise, start playing this episode
    if (isCurrentLecture) {
      togglePlayPause();
    } else {
      playEpisode(episode);
    }
  }, [episode, canPlay, isCurrentLecture, togglePlayPause, playEpisode]);

  const handleDownloadPress = useCallback(async () => {
    if (!episode) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Handle different download states
      if (downloadStatus === DownloadStatus.DOWNLOADING) {
        // Pause the download
        await pauseDownload(episode.id);
        addSentryBreadcrumb('Paused lecture download', 'user', {
          lectureId: episode.id,
          title: episode.title,
        });
      } else if (downloadStatus === DownloadStatus.PAUSED) {
        // Resume the download
        await resumeDownload(episode.id);
        addSentryBreadcrumb('Resumed lecture download', 'user', {
          lectureId: episode.id,
          title: episode.title,
        });
      } else if (downloadStatus === DownloadStatus.COMPLETED) {
        // Already downloaded, show message
        Alert.alert(
          "Already Downloaded",
          "This lecture is already available offline.",
          [{ text: "OK" }]
        );
      } else {
        // Start new download by adding to queue
        addSentryBreadcrumb('Adding lecture to download queue', 'user', {
          lectureId: episode.id,
          title: episode.title,
        });
        await addToQueue(episode);
      }
    } catch (error: any) {
      captureSentryException(error, {
        component: 'LectureDetailScreen',
        action: 'handleDownloadPress',
        lectureId: episode.id,
        title: episode.title,
        level: 'error',
      });

      Alert.alert(
        "Download Error",
        error.message || "Failed to manage download. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [episode, downloadStatus, addToQueue, pauseDownload, resumeDownload]);

  const handleCancelDownload = useCallback(() => {
    if (!episode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Cancel Download",
      "Are you sure you want to cancel this download?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => cancelDownload(episode.id),
        },
      ]
    );
  }, [episode, cancelDownload]);

  const handleLike = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate the heart
      likeScale.value = withSpring(1.3, {}, () => {
        likeScale.value = withSpring(1);
      });

      // Toggle favorite (works offline!)
      await toggleFavorite(lectureId);

      addSentryBreadcrumb('Toggled favorite', 'user', {
        lectureId,
        liked: !liked,
      });
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);

      if (error.statusCode === 401) {
        // Redirect to sign-in page if not authenticated
        router.push("/sign-in");
      } else if (!error.isNetworkError) {
        // Don't show alert for network errors - favorites work offline
        Alert.alert(
          'Error',
          'Failed to update favorite. Please try again.',
          [{ text: 'OK' }]
        );
      }

      captureSentryException(error, {
        component: 'LectureDetailScreen',
        action: 'handleLike',
        lectureId,
      });
    }
  }, [lectureId, toggleFavorite, liked, router, likeScale]);

  const handleShare = useCallback(() => {
    if (!lecture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const webLink = linkingService.createLectureLink(lecture.id);

    const baseMessage = `🎧 ${lecture.title}\n👤 ${lecture.lecturerName || 'Dawah Nigeria'}\n\n${webLink}`;
    const message = appendShareSignature(baseMessage);

    Share.share({
      title: lecture.title,
      message,
      url: webLink, // iOS will use this for sharing
    }).catch((shareError) => {
      console.warn("Failed to share lecture", shareError);
      captureSentryException(shareError, {
        component: 'LectureDetailScreen',
        action: 'handleShare',
        lectureId: id,
        title: lecture.title,
        level: 'warning',
      });
    });
  }, [lecture, id]);

  const handleSpeedChange = useCallback(() => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [playbackSpeed]);

  const formatNumber = (num?: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Clean up title by removing scholar name (after last " - ")
  const cleanTitle = (title: string, lecturerName?: string): string => {
    if (!lecturerName) return title;

    // Find the last occurrence of " - " which typically precedes the scholar name
    const lastHyphenIndex = title.lastIndexOf(' - ');

    if (lastHyphenIndex === -1) return title;

    // Check if the text after the last hyphen contains the lecturer name
    const afterHyphen = title.substring(lastHyphenIndex + 3);

    // If it looks like it contains the lecturer name, truncate it
    if (lecturerName && afterHyphen.includes(lecturerName.split(' ')[0])) {
      return title.substring(0, lastHyphenIndex).trim();
    }

    return title;
  };

  // Loading/Error States
  if (loading) {
    return (
      <SafeAreaView
        style={[tw`flex-1 items-center justify-center`, { backgroundColor: designTokens.colors.system.background.primary }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
        <Text variant="body" color="secondaryLabel" style={tw`mt-4`}>
          Loading lecture...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !lecture) {
    return (
      <SafeAreaView
        style={[tw`flex-1 items-center justify-center px-8`, { backgroundColor: designTokens.colors.system.background.primary }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={designTokens.colors.semantic.red}
        />
        <Text variant="title2" weight="bold" color="label" style={tw`mt-4 text-center`}>
          {error || "Lecture not found"}
        </Text>
        <Button variant="filled" size="large" style={tw`mt-6`} onPress={() => router.back()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  // Render animated header that fades in on scroll
  const renderHeader = () => (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: 50,
          paddingBottom: 12,
          paddingHorizontal: 16,
        },
        headerAnimatedStyle,
      ]}
    >
      <BlurView intensity={80} tint="prominent" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={tw`flex-row items-center justify-between`}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={tw`w-10 h-10 items-center justify-center`}>
          <Ionicons name="chevron-back" size={28} color={designTokens.colors.system.label.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/playlists'); }} style={tw`w-10 h-10 items-center justify-center ml-2`}>
          <Ionicons name="list" size={24} color={designTokens.colors.system.label.primary} />
        </TouchableOpacity>
        <View style={tw`flex-1 mx-3`}>
          <Text variant="body" color="label" weight="semibold" numberOfLines={1} style={tw`text-center`}>
            {lecture ? cleanTitle(lecture.title, lecture.lecturerName) : ''}
          </Text>
        </View>
        <Animated.View style={likeAnimatedStyle}>
          <TouchableOpacity onPress={handleLike} style={tw`w-10 h-10 items-center justify-center`}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={26}
              color={liked ? designTokens.colors.semantic.red : designTokens.colors.system.label.primary}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
          <Text variant="body" color="secondaryLabel" style={tw`mt-3`}>
            Loading lecture...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8`}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={designTokens.colors.semantic.red}
          />
          <Text variant="title3" color="label" weight="semibold" style={tw`mt-4 text-center`}>
            Unable to load lecture
          </Text>
          <Text variant="body" color="secondaryLabel" style={tw`mt-2 text-center`}>
            {error}
          </Text>
          <Button
            variant="filled"
            size="medium"
            style={tw`mt-6`}
            onPress={refetch}
          >
            Try again
          </Button>
        </View>
      );
    }

    if (!lecture) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8`}>
          <Ionicons
            name="help-circle-outline"
            size={48}
            color={designTokens.colors.system.label.tertiary}
          />
          <Text variant="title3" color="label" weight="semibold" style={tw`mt-4 text-center`}>
            Lecture not found
          </Text>
          <Button
            variant="filled"
            size="medium"
            style={tw`mt-6`}
            onPress={() => router.back()}
          >
            Go back
          </Button>
        </View>
      );
    }

    return (
      <Animated.ScrollView
        contentContainerStyle={tw`pb-32`}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero Section with Parallax */}
        <View style={{ height: HEADER_HEIGHT }}>
          <Animated.View style={[{ height: HEADER_HEIGHT, width: SCREEN_WIDTH }, imageAnimatedStyle]}>
            {lecture.coverUrl ? (
              <Image
                source={{ uri: lecture.coverUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: designTokens.colors.system.fill.secondary }]}>
                <Ionicons name="musical-notes-outline" size={64} color={designTokens.colors.system.label.tertiary} />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
            />
          </Animated.View>
        </View>

        {/* Content Section */}
        <View style={[tw`px-6 -mt-12`, { backgroundColor: designTokens.colors.system.background.primary, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          {/* Title and Lecturer */}
          <View style={tw`pt-6`}>
            <Text
              variant="title1"
              color="label"
              weight="bold"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={tw`text-left`}
            >
              {cleanTitle(lecture.title, lecture.lecturerName)}
            </Text>
            {lecture.lecturerName && (
              <Touchable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={tw`flex-row items-center mt-3`}>
                  <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, { backgroundColor: designTokens.colors.brand.primary + '20' }]}>
                    <Ionicons name="person" size={20} color={designTokens.colors.brand.primary} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text variant="subheadline" color="label" weight="semibold">
                      {lecture.lecturerName}
                    </Text>
                    {lecture.language && (
                      <Text variant="caption1" color="secondaryLabel">
                        {lecture.language}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={designTokens.colors.system.label.tertiary} />
                </View>
              </Touchable>
            )}
          </View>

          {/* Stats Cards */}
          <View style={[tw`flex-row mt-6`, { gap: 12 }]}>
            {[
              { label: "Plays", value: lecture.views, icon: "play-circle" },
              { label: "Downloads", value: lecture.downloads, icon: "download" },
              { label: "Shares", value: lecture.shares, icon: "share-social" },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  tw`flex-1 items-center`,
                  {
                    backgroundColor: designTokens.colors.system.background.secondary,
                    paddingVertical: designTokens.spacing.lg,
                    borderRadius: designTokens.borderRadius.xl,
                  },
                ]}
              >
                <Ionicons name={item.icon as any} size={20} color={designTokens.colors.brand.primary} />
                <Text variant="headline" color="label" weight="bold" style={tw`mt-2`}>
                  {formatNumber(item.value)}
                </Text>
                <Text variant="caption2" color="tertiaryLabel" style={tw`mt-1`}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Categories */}
          {lecture.categories && lecture.categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`mt-6 pb-2`}
              style={tw`-mx-1`}
            >
              {lecture.categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  variant="primary"
                  style={tw`mx-1`}
                />
              ))}
            </ScrollView>
          )}

          {/* Description */}
          {lecture.description && lecture.description.trim() && (
            <View style={tw`mt-6`}>
              <Text variant="title3" color="label" weight="bold">
                About this lecture
              </Text>
              <Text
                variant="body"
                color="secondaryLabel"
                style={tw`mt-3 leading-6`}
                numberOfLines={showFullDescription ? undefined : 4}
              >
                {lecture.description.trim()}
              </Text>
              {lecture.description.length > 200 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowFullDescription(!showFullDescription);
                  }}
                  style={tw`mt-2`}
                >
                  <Text variant="subheadline" color="brand" weight="semibold">
                    {showFullDescription ? 'Show less' : 'Show more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Details Section - User-friendly info only */}
          {(() => {
            const meta = [
              lecture.durationLabel && { label: "Duration", value: lecture.durationLabel, icon: "time-outline" },
              lecture.albumName && { label: "Album", value: lecture.albumName, icon: "albums-outline" },
              lecture.postedDate && { label: "Released", value: new Date(lecture.postedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), icon: "calendar-outline" },
            ].filter(Boolean);

            if (meta.length === 0) return null;

            return (
              <View style={tw`mt-6`}>
                <Text variant="title3" color="label" weight="bold" style={tw`mb-3`}>
                  Details
                </Text>
                {meta.map((item: any) => (
                  <View key={item.label} style={tw`flex-row items-center mb-3`}>
                    <View style={[tw`w-8 h-8 rounded-full items-center justify-center mr-3`, { backgroundColor: designTokens.colors.system.fill.secondary }]}>
                      <Ionicons name={item.icon} size={16} color={designTokens.colors.system.label.secondary} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text variant="caption1" color="tertiaryLabel">
                        {item.label}
                      </Text>
                      <Text variant="subheadline" color="label" weight="medium">
                        {item.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Chart Positions */}
          {(() => {
            if (!lecture.charts) return null;
            const entries = Object.entries(lecture.charts).filter(
              ([_, value]) => typeof value === "number",
            );
            if (entries.length === 0) return null;

            return (
              <View style={tw`mt-6 mb-4`}>
                <Text variant="title3" color="label" weight="bold">
                  Chart Positions
                </Text>
                <View style={[tw`flex-row flex-wrap mt-3`, { gap: 12 }]}>
                  {entries.map(([key, value]) => (
                    <View
                      key={key}
                      style={[
                        tw`items-center`,
                        {
                          backgroundColor: designTokens.colors.brand.primary + '15',
                          paddingHorizontal: designTokens.spacing.lg,
                          paddingVertical: designTokens.spacing.md,
                          borderRadius: designTokens.borderRadius.xl,
                          borderWidth: 1,
                          borderColor: designTokens.colors.brand.primary + '30',
                        },
                      ]}
                    >
                      <Text variant="title2" color="brand" weight="bold">
                        #{value}
                      </Text>
                      <Text variant="caption1" color="secondaryLabel" style={tw`mt-1`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </View>
      </Animated.ScrollView>
    );
  };

  const renderPlaybackControls = () => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const duration = episode?.durationSec || 0;
    const progress = isCurrentLecture ? currentProgress : 0;
    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    return (
      <View style={[tw`px-6 pb-8 pt-4`, { backgroundColor: designTokens.colors.system.background.primary }]}>
        {/* Progress Bar */}
        <View style={tw`mb-2`}>
          <View style={[tw`h-1 rounded-full overflow-hidden`, { backgroundColor: designTokens.colors.system.fill.tertiary }]}>
            <View
              style={[
                tw`h-full rounded-full`,
                {
                  backgroundColor: designTokens.colors.brand.primary,
                  width: `${progressPercent}%`
                }
              ]}
            />
          </View>
          <View style={tw`flex-row justify-between mt-2`}>
            <Text variant="caption2" color="tertiaryLabel">
              {formatTime(progress)}
            </Text>
            <Text variant="caption2" color="tertiaryLabel">
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Main Playback Controls */}
        <View style={tw`flex-row items-center justify-center mt-4 mb-4`}>
          {/* Shuffle */}
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={tw`w-12 h-12 items-center justify-center`}
          >
            <Ionicons name="shuffle" size={24} color={designTokens.colors.system.label.secondary} />
          </TouchableOpacity>

          {/* Previous */}
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            style={tw`w-14 h-14 items-center justify-center mx-4`}
          >
            <Ionicons name="play-back" size={32} color={designTokens.colors.system.label.primary} />
          </TouchableOpacity>

          {/* Play/Pause - Large Center Button */}
          <TouchableOpacity
            onPress={handlePlayPress}
            disabled={!canPlay}
            style={[
              tw`w-20 h-20 rounded-full items-center justify-center mx-6`,
              {
                backgroundColor: canPlay ? designTokens.colors.brand.primary : designTokens.colors.system.fill.tertiary,
                shadowColor: designTokens.colors.brand.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            ]}
          >
            <Ionicons
              name={!canPlay ? "alert-circle" : isCurrentlyPlaying ? "pause" : "play"}
              size={36}
              color={canPlay ? designTokens.colors.system.background.primary : designTokens.colors.system.label.tertiary}
              style={!canPlay ? {} : { marginLeft: isCurrentlyPlaying ? 0 : 3 }}
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            style={tw`w-14 h-14 items-center justify-center mx-4`}
          >
            <Ionicons name="play-forward" size={32} color={designTokens.colors.system.label.primary} />
          </TouchableOpacity>

          {/* Repeat */}
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={tw`w-12 h-12 items-center justify-center`}
          >
            <Ionicons name="repeat" size={24} color={designTokens.colors.system.label.secondary} />
          </TouchableOpacity>
        </View>

        {/* Secondary Actions */}
        <View style={tw`flex-row items-center justify-between mt-2`}>
          {/* Download Button Group */}
          <View style={tw`flex-row items-center`}>
          { (downloadStatus === DownloadStatus.DOWNLOADING ||
            downloadStatus === DownloadStatus.PAUSED ||
            downloadStatus === DownloadStatus.QUEUED) && (
              <TouchableOpacity onPress={handleCancelDownload} style={tw`mr-4`}>
                <Ionicons name="close-circle-outline" size={24} color={designTokens.colors.semantic.red} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleDownloadPress}
              disabled={episode === null}
              style={tw`flex-row items-center`}
            >
              <Ionicons
                name={
                  downloadStatus === DownloadStatus.COMPLETED
                    ? "checkmark-circle"
                    : downloadStatus === DownloadStatus.DOWNLOADING
                      ? "pause-circle-outline"
                      : downloadStatus === DownloadStatus.PAUSED
                        ? "play-circle-outline"
                        : downloadStatus === DownloadStatus.QUEUED
                          ? "time-outline"
                          : downloadStatus === DownloadStatus.FAILED
                            ? "alert-circle-outline"
                            : "arrow-down-circle-outline"
                }
                size={24}
                color={
                  downloadStatus === DownloadStatus.COMPLETED
                    ? designTokens.colors.brand.primary
                    : downloadStatus === DownloadStatus.FAILED
                      ? designTokens.colors.semantic.red
                      : designTokens.colors.system.label.secondary
                }
              />
              <Text
                variant="caption1"
                color={
                  downloadStatus === DownloadStatus.COMPLETED
                    ? "brand"
                    : downloadStatus === DownloadStatus.FAILED
                      ? "systemRed"
                      : "secondaryLabel"
                }
                style={tw`ml-2`}
              >
                {downloadStatus === DownloadStatus.COMPLETED
                  ? "Downloaded"
                  : downloadStatus === DownloadStatus.DOWNLOADING
                    ? `${Math.round(downloadProgress * 100)}%`
                    : downloadStatus === DownloadStatus.PAUSED
                      ? "Paused"
                      : downloadStatus === DownloadStatus.QUEUED
                        ? "Queued"
                        : downloadStatus === DownloadStatus.FAILED
                          ? "Failed"
                          : "Download"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleShare} style={tw`flex-row items-center`}>
            <Ionicons name="share-outline" size={24} color={designTokens.colors.system.label.secondary} />
            <Text variant="caption1" color="secondaryLabel" style={tw`ml-2`}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            if (!isAuthenticated) {
              router.push("/sign-in");
            } else {
              setShowAddToPlaylistModal(true);
            }
          }} style={tw`flex-row items-center`}>
            <Ionicons name="add-circle-outline" size={24} color={designTokens.colors.system.label.secondary} />
            <Text variant="caption1" color="secondaryLabel" style={tw`ml-2`}>
              Add to Playlist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSpeedChange} style={tw`flex-row items-center`}>
            <Ionicons name="speedometer-outline" size={24} color={designTokens.colors.system.label.secondary} />
            <Text variant="caption1" color="secondaryLabel" style={tw`ml-2`}>
              {playbackSpeed}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
      edges={["top", "left", "right", "bottom"]}
    >
      {renderHeader()}
      <View style={tw`flex-1`}>{renderContent()}</View>
      {lecture && renderPlaybackControls()}

      {lecture && (
        <AddToPlaylistModal
          isVisible={showAddToPlaylistModal}
          onClose={() => setShowAddToPlaylistModal(false)}
          audioId={lecture.id}
          onAudioAdded={() => Alert.alert('Success', 'Audio added to playlist!')}
        />
      )}
    </SafeAreaView>
  );
};

export default LectureDetailScreen;
