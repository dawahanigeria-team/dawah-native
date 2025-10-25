/**
 * World-Class Lecture Details Screen
 * Premium design with smooth animations and rich features
 */

import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

import { Button, Chip, Text, Touchable } from "../../src/components/atoms";
import { useLectureDetail } from "../../src/hooks/useLectureDetail";
import { usePlayerStore, useDownloadsStore } from "../../src/stores";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { captureSentryException, addSentryBreadcrumb } from "../../src/services/config/sentry.config";
import type { Episode } from "../../src/types/types";
import type { LectureDetail } from "../../src/types/api.types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
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

const formatStat = (value?: number) =>
  (value ?? 0).toLocaleString("en-US");

const formatLabel = (label: string, value?: string) => {
  if (!value) return null;
  return `${label}: ${value}`;
};

const LectureDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lectureId = id ?? "";
  const { lecture, loading, error, refetch } = useLectureDetail(lectureId);

  const {
    playEpisode,
    togglePlayPause,
    currentEpisode,
    isPlaying,
    progress: currentProgress,
    duration: currentDuration,
  } = usePlayerStore();

  const {
    downloadLecture,
    isDownloaded: checkIsDownloaded,
    isDownloading: checkIsDownloading,
    getDownloadProgress,
  } = useDownloadsStore();

  // State management
  const [liked, setLiked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

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
  const isDownloaded = episode ? checkIsDownloaded(episode.id) : false;
  const isDownloading = episode ? checkIsDownloading(episode.id) : false;
  const downloadProgress = episode ? getDownloadProgress(episode.id) : 0;

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
      [0, 0.5, 1],
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
  }, []);

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

  const handleDownload = useCallback(async () => {
    if (!episode) return;

    // If already downloaded, show alert
    if (isDownloaded) {
      Alert.alert(
        "Already Downloaded",
        "This lecture is already available offline.",
        [{ text: "OK" }]
      );
      return;
    }

    // If currently downloading, ignore
    if (isDownloading) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      addSentryBreadcrumb('Starting lecture download', 'user', {
        lectureId: episode.id,
        title: episode.title,
      });
      await downloadLecture(episode);
      Alert.alert(
        "Download Complete",
        `${episode.title} is now available offline!`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      captureSentryException(error, {
        component: 'LectureDetailScreen',
        action: 'handleDownload',
        lectureId: episode.id,
        title: episode.title,
        level: 'error',
      });
      Alert.alert(
        "Download Failed",
        error.message || "Failed to download lecture. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [episode, isDownloaded, isDownloading, downloadLecture]);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked(!liked);
    likeScale.value = withSpring(1.3, {}, () => {
      likeScale.value = withSpring(1);
    });
  }, [liked]);

  const handleShare = useCallback(() => {
    if (!lecture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const message = lecture.audioUrl
      ? `Check out: ${lecture.title} by ${lecture.lecturerName || 'Unknown'}\n\nListen: ${lecture.audioUrl}`
      : `Check out: ${lecture.title}${lecture.lecturerName ? ` by ${lecture.lecturerName}` : ''}`;

    Share.share({
      title: lecture.title,
      message,
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
  }, [lecture]);

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
                {meta.map((item: any, index) => (
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
          <TouchableOpacity
            onPress={handleDownload}
            disabled={isDownloading}
            style={tw`flex-row items-center`}
          >
            <Ionicons
              name={
                isDownloaded
                  ? "checkmark-circle"
                  : isDownloading
                  ? "cloud-download"
                  : "arrow-down-circle-outline"
              }
              size={24}
              color={
                isDownloaded
                  ? designTokens.colors.brand.primary
                  : designTokens.colors.system.label.secondary
              }
            />
            <Text
              variant="caption1"
              color={isDownloaded ? "brand" : "secondaryLabel"}
              style={tw`ml-2`}
            >
              {isDownloaded
                ? "Downloaded"
                : isDownloading
                ? `${Math.round(downloadProgress * 100)}%`
                : "Download"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={tw`flex-row items-center`}>
            <Ionicons name="share-outline" size={24} color={designTokens.colors.system.label.secondary} />
            <Text variant="caption1" color="secondaryLabel" style={tw`ml-2`}>
              Share
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
    </SafeAreaView>
  );
};

export default LectureDetailScreen;
