import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname } from "expo-router";
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayerStore } from "../../stores/playerStore";
import { designTokens } from "../../theme/designTokens";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { Loading, Text, Touchable } from "../atoms";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const MINI_PLAYER_HEIGHT = 72;
const TAB_BAR_HEIGHT = 83; // iOS standard tab bar height

interface MiniPlayerProps {
  onExpand?: () => void;
  onMinimize?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = memo(
  ({ onExpand, onMinimize }) => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const {
      currentEpisode,
      isPlaying,
      progress,
      duration,
      isExpanded,
      isLoading,
      isDownloading,
      downloadProgress,
      togglePlayPause,
      expandPlayer,
      minimizePlayer,
      seekForward,
      seekBackward,
      downloadEpisode,
      closePlayer,
      setProgress,
    } = usePlayerStore();

    const [imageError, setImageError] = useState(false);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const dragY = useSharedValue(0);
    const gestureStartY = useSharedValue(0);
    const isExpandedShared = useSharedValue(isExpanded ? 1 : 0);

    // Check if we're on a tab screen
    const isTabScreen =
      pathname?.includes("/(tabs)") ||
      pathname === "/" ||
      pathname === "/search" ||
      pathname === "/library" ||
      pathname === "/profile";

    // Calculate expanded height based on whether we're on a tab screen
    // Use full screen height with only top safe area
    const EXPANDED_PLAYER_HEIGHT = isTabScreen
      ? screenHeight - TAB_BAR_HEIGHT - insets.top
      : screenHeight - insets.top;

    useEffect(() => {
      isExpandedShared.value = isExpanded ? 1 : 0;
    }, [isExpanded, isExpandedShared]);

    // Gesture handler for drag-to-minimize using Reanimated 4+ Gesture API
    const expandedPanGesture = useMemo(
      () =>
        Gesture.Pan()
          .onStart(() => {
            gestureStartY.value = dragY.value;
          })
          .onUpdate((event) => {
            if (isExpandedShared.value) {
              dragY.value = gestureStartY.value + event.translationY;
            }
          })
          .onEnd((event) => {
            const isPlayerExpanded = isExpandedShared.value === 1;
            if (!isPlayerExpanded) {
              dragY.value = withSpring(0);
              return;
            }

            const shouldMinimize =
              event.translationY > 100 || event.velocityY > 500;
            if (shouldMinimize) {
              runOnJS(minimizePlayer)();
            }
            dragY.value = withSpring(0);
          }),
      [dragY, gestureStartY, isExpandedShared, minimizePlayer]
    );

    // Animation styles
    const animatedStyle = useAnimatedStyle(() => {
      const height = interpolate(
        dragY.value,
        [0, 200],
        [EXPANDED_PLAYER_HEIGHT, MINI_PLAYER_HEIGHT],
        Extrapolate.CLAMP
      );

      return {
        height: withSpring(isExpanded ? height : MINI_PLAYER_HEIGHT),
        transform: [{ translateY: withSpring(translateY.value) }],
        opacity: opacity.value,
      };
    });

    // Simulate audio progress (in real implementation, this comes from expo-audio via AudioProvider)
    useEffect(() => {
      if (!currentEpisode) return;

      let interval: ReturnType<typeof setInterval>;
      if (isPlaying && !isLoading) {
        interval = setInterval(() => {
          setProgress(Math.min(progress + 1, duration));
        }, 1000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [isPlaying, isLoading, progress, duration, setProgress, currentEpisode]);

    // Don't render if no episode is playing
    if (!currentEpisode) {
      return null;
    }

    const handleExpand = () => {
      expandPlayer();
      onExpand?.();
    };

    const handleMinimize = () => {
      minimizePlayer();
      onMinimize?.();
    };

    const handleClose = () => {
      opacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(closePlayer)();
      });
    };

    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

    const renderMiniPlayer = () => (
      <View style={styles.miniPlayerContainer}>
        {/* Progress Bar with Draggable Thumb */}
        <View style={styles.progressContainer}>
          <PanGestureHandler
            onGestureEvent={(event) => {
              const containerWidth = screenWidth; // Full screen width for mini player
              const newProgress = Math.max(
                0,
                Math.min(
                  duration,
                  (event.nativeEvent.x / containerWidth) * duration
                )
              );
              setProgress(newProgress);
            }}
          >
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: designTokens.colors.brand.primary,
                  },
                ]}
              />
              {/* Draggable Progress Thumb */}
              <View
                style={[
                  styles.miniProgressThumb,
                  {
                    left: `${progressPercentage}%`,
                    backgroundColor: designTokens.colors.brand.primary,
                  },
                ]}
              />
            </View>
          </PanGestureHandler>
        </View>

        {/* Main Content */}
        <Pressable style={styles.miniPlayerContent} onPress={handleExpand}>
          {/* Album Art */}
          <View style={styles.albumArt}>
            {currentEpisode.coverUrl && !imageError ? (
              <Image
                source={{ uri: currentEpisode.coverUrl }}
                style={styles.albumImage}
                contentFit="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View
                style={[
                  styles.albumImage,
                  getPlaceholderStyle(currentEpisode.id, 56),
                ]}
              >
                <Text
                  style={{
                    fontSize: designTokens.typography.fontSize.caption1,
                    fontWeight: designTokens.typography.fontWeight.bold,
                    color: designTokens.colors.system.label.primary,
                  }}
                >
                  {getInitials(currentEpisode.title)}
                </Text>
              </View>
            )}
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text
              variant="subheadline"
              color="label"
              weight="semibold"
              numberOfLines={1}
              style={{ marginBottom: 2 }}
            >
              {currentEpisode.title}
            </Text>
            <Text variant="caption1" color="secondaryLabel" numberOfLines={1}>
              {currentEpisode.lecturerName || "Dawah Nigeria"} • {formatDuration(progress)}/{formatDuration(duration)}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.miniControls}>
            {/* Rewind Button */}
            <Touchable
              onPress={() => seekBackward(15)}
              style={styles.miniControlButton}
              accessibilityLabel="Rewind 15 seconds"
              accessibilityRole="button"
            >
              <Ionicons
                name="play-back"
                size={20}
                color={designTokens.colors.system.label.secondary}
              />
            </Touchable>

            {/* Play/Pause Button */}
            {isLoading ? (
              <Loading size="small" />
            ) : (
              <Touchable
                onPress={togglePlayPause}
                style={styles.playButton}
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
                accessibilityRole="button"
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color={designTokens.colors.system.label.primary}
                />
              </Touchable>
            )}

            {/* Forward Button */}
            <Touchable
              onPress={() => seekForward(15)}
              style={styles.miniControlButton}
              accessibilityLabel="Forward 15 seconds"
              accessibilityRole="button"
            >
              <Ionicons
                name="play-forward"
                size={20}
                color={designTokens.colors.system.label.secondary}
              />
            </Touchable>
          </View>
        </Pressable>
      </View>
    );

    const renderExpandedPlayer = () => (
      <GestureDetector gesture={expandedPanGesture}>
        <Animated.View style={styles.expandedPlayerContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={styles.dragIndicator} />
          </View>

          {/* Header */}
          <View style={styles.expandedHeader}>
            <Touchable
              onPress={handleMinimize}
              style={styles.minimizeButton}
              accessibilityLabel="Minimize player"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-down"
                size={24}
                color={designTokens.colors.system.label.primary}
              />
            </Touchable>

            <View style={styles.headerInfo}>
              <Text
                variant="caption1"
                color="secondaryLabel"
                style={{ textAlign: "center" }}
              >
                Now Playing
              </Text>
            </View>

            <Touchable
              onPress={handleMinimize}
              style={styles.minimizeButton}
              accessibilityLabel="Minimize player"
              accessibilityRole="button"
            >
              <Ionicons
                name="close"
                size={24}
                color={designTokens.colors.system.label.primary}
              />
            </Touchable>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.expandedContentScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.expandedContentContainer}
          >
            {/* Large Album Art */}
            <View style={styles.expandedAlbumArt}>
              {currentEpisode.coverUrl && !imageError ? (
                <Image
                  source={{ uri: currentEpisode.coverUrl }}
                  style={styles.expandedAlbumImage}
                  contentFit="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View
                  style={[
                    styles.expandedAlbumImage,
                    getPlaceholderStyle(currentEpisode.id, 200),
                  ]}
                >
                  <Text
                    style={{
                      fontSize: designTokens.typography.fontSize.title1,
                      fontWeight: designTokens.typography.fontWeight.bold,
                      color: designTokens.colors.system.label.primary,
                    }}
                  >
                    {getInitials(currentEpisode.title)}
                  </Text>
                </View>
              )}
            </View>

            {/* Track Info */}
            <View style={styles.expandedTrackInfo}>
              <Text
                variant="title1"
                color="label"
                weight="bold"
                numberOfLines={2}
                style={{ textAlign: "center", marginBottom: 8 }}
              >
                {currentEpisode.title}
              </Text>
              <Text
                variant="body"
                color="secondaryLabel"
                style={{ textAlign: "center", marginBottom: 4 }}
              >
                {currentEpisode.lecturerName || "Dawah Nigeria"}
              </Text>
              <Text
                variant="caption1"
                color="tertiaryLabel"
                style={{ textAlign: "center" }}
              >
                Islamic Lecture • {currentEpisode.language || "Hausa"}
              </Text>
            </View>

            {/* Progress Slider */}
            <View style={styles.progressSliderContainer}>
              <View style={styles.progressSlider}>
                <PanGestureHandler
                  onGestureEvent={(event) => {
                    const trackWidth = 280; // Approximate track width
                    const newProgress = Math.max(
                      0,
                      Math.min(
                        duration,
                        (event.nativeEvent.x / trackWidth) * duration
                      )
                    );
                    setProgress(newProgress);
                  }}
                >
                  <View style={styles.progressSliderTrack}>
                    <View
                      style={[
                        styles.progressSliderFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: designTokens.colors.brand.primary,
                        },
                      ]}
                    />
                    <View
                      style={{
                        ...styles.progressThumb,
                        left: `${progressPercentage}%`,
                        backgroundColor: designTokens.colors.brand.primary,
                      }}
                    />
                  </View>
                </PanGestureHandler>
              </View>
              <View style={styles.timeLabels}>
                <Text variant="caption2" color="secondaryLabel">
                  {formatDuration(progress)}
                </Text>
                <Text variant="caption2" color="secondaryLabel">
                  {formatDuration(duration)}
                </Text>
              </View>
            </View>

            {/* Main Controls */}
            <View style={styles.expandedControls}>
              <Touchable
                onPress={() => seekBackward(15)}
                style={styles.seekButton}
                accessibilityLabel="Rewind 15 seconds"
                accessibilityRole="button"
              >
                <Ionicons
                  name="play-back"
                  size={32}
                  color={designTokens.colors.system.label.primary}
                />
              </Touchable>

              {isLoading ? (
                <View style={styles.mainPlayButton}>
                  <Loading size="large" />
                </View>
              ) : (
                <Touchable
                  onPress={togglePlayPause}
                  style={styles.mainPlayButton}
                  accessibilityLabel={isPlaying ? "Pause" : "Play"}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color={designTokens.colors.system.label.primary}
                  />
                </Touchable>
              )}

              <Touchable
                onPress={() => seekForward(15)}
                style={styles.seekButton}
                accessibilityLabel="Forward 15 seconds"
                accessibilityRole="button"
              >
                <Ionicons
                  name="play-forward"
                  size={32}
                  color={designTokens.colors.system.label.primary}
                />
              </Touchable>
            </View>

            {/* Secondary Controls */}
            <View style={styles.secondaryControls}>
              <Touchable
                style={styles.secondaryButton}
                accessibilityLabel="Share"
                accessibilityRole="button"
              >
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={designTokens.colors.system.label.secondary}
                />
              </Touchable>

              <Touchable
                onPress={() => downloadEpisode(currentEpisode)}
                style={styles.secondaryButton}
                accessibilityLabel={
                  isDownloading ? "Downloading..." : "Download"
                }
                accessibilityRole="button"
              >
                {isDownloading ? (
                  <View style={styles.downloadProgress}>
                    <Loading size="small" />
                    <Text
                      variant="caption2"
                      color="secondaryLabel"
                      style={{ marginLeft: 4 }}
                    >
                      {Math.round(downloadProgress * 100)}%
                    </Text>
                  </View>
                ) : (
                  <Ionicons
                    name="download-outline"
                    size={24}
                    color={designTokens.colors.system.label.secondary}
                  />
                )}
              </Touchable>
            </View>

            {/* Detailed Metadata Section */}
            <View style={styles.metadataSection}>
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Released
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    March 15, 2024
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="musical-notes-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Genre
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    Islamic Tafsir &amp; Exegesis
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="language-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Language
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    Arabic & English
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Series
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    Tafsir Al-Qur&apos;an Al-Kareem
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Recorded
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    Masjid Al-Nabawi, Madinah
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Audience
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    Students & Scholars
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="bookmark-outline"
                    size={16}
                    color={designTokens.colors.system.label.tertiary}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{ marginLeft: 6 }}
                  >
                    Topics
                  </Text>
                  <Text
                    variant="subheadline"
                    color="label"
                    style={{ marginLeft: 8 }}
                  >
                    Quranic Interpretation, Islamic Law, Spirituality
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    );

    return (
      <GestureHandlerRootView
        style={[
          styles.container,
          {
            // Dynamically position based on whether we're on a tab screen
            bottom: isTabScreen ? TAB_BAR_HEIGHT : 0,
          },
        ]}
      >
        <Animated.View style={[styles.player, animatedStyle]}>
          {isExpanded ? renderExpandedPlayer() : renderMiniPlayer()}
        </Animated.View>
      </GestureHandlerRootView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    // bottom is set dynamically based on route
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  player: {
    backgroundColor: designTokens.colors.system.background.secondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: designTokens.colors.system.separator.primary,
    shadowColor: designTokens.colors.system.label.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  // Mini Player Styles
  miniPlayerContainer: {
    height: MINI_PLAYER_HEIGHT,
  },
  progressContainer: {
    height: 2,
    backgroundColor: "transparent",
  },
  progressTrack: {
    height: 2,
    backgroundColor: designTokens.colors.system.fill.quaternary,
  },
  progressFill: {
    height: 2,
  },
  miniProgressThumb: {
    position: "absolute",
    top: -4, // Center on the 2px progress track
    width: 10,
    height: 10,
    borderRadius: 5,
    transform: [{ translateX: -5 }], // Center the thumb on the progress line
    shadowColor: designTokens.colors.system.label.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
  },
  albumArt: {
    marginRight: designTokens.spacing.md,
  },
  albumImage: {
    width: 56,
    height: 56,
    borderRadius: designTokens.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  trackInfo: {
    flex: 1,
    marginRight: designTokens.spacing.md,
  },
  miniControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 150,
  },
  miniControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: designTokens.colors.system.fill.secondary,
  },
  // Expanded Player Styles
  expandedPlayerContainer: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.xl,
    paddingTop: designTokens.spacing.xl,
    paddingBottom: designTokens.spacing["2xl"],
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: designTokens.spacing.xl,
  },
  minimizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  expandedAlbumArt: {
    alignItems: "center",
    marginBottom: designTokens.spacing.lg,
  },
  expandedAlbumImage: {
    width: 200,
    height: 200,
    borderRadius: designTokens.borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  expandedTrackInfo: {
    alignItems: "center",
    marginBottom: designTokens.spacing.lg,
  },
  progressSliderContainer: {
    marginBottom: designTokens.spacing.lg,
  },
  progressSlider: {
    marginBottom: designTokens.spacing.sm,
  },
  progressSliderTrack: {
    height: 4,
    backgroundColor: designTokens.colors.system.fill.quaternary,
    borderRadius: 2,
    position: "relative",
  },
  progressSliderFill: {
    height: 4,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    transform: [{ translateX: -8 }], // Center the thumb on the progress line
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expandedControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: designTokens.spacing.lg,
  },
  seekButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: designTokens.spacing.xl,
  },
  mainPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: designTokens.colors.system.fill.secondary,
  },
  secondaryControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: designTokens.spacing.lg,
  },
  downloadProgress: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Metadata Section Styles
  metadataSection: {
    marginTop: designTokens.spacing.xl,
    paddingTop: designTokens.spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: designTokens.colors.system.separator.primary,
  },
  metadataRow: {
    marginBottom: designTokens.spacing.md,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: designTokens.spacing.sm,
  },
  // Drag Handle Styles
  dragHandle: {
    alignItems: "center",
    paddingTop: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.md,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.system.fill.quaternary,
  },
  // ScrollView Styles
  expandedContentScroll: {
    flex: 1,
  },
  expandedContentContainer: {
    paddingBottom: designTokens.spacing.xl,
  },
});

MiniPlayer.displayName = "MiniPlayer";
