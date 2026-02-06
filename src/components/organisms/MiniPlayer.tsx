import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname } from "expo-router";
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLectureDetail } from "../../hooks/useLectureDetail";
import { useTheme } from "../../hooks/useTheme";
import { useDownloadsStore } from "../../stores";
import { usePlayerStore, resolveEpisodeArtistName } from "../../stores/playerStore";
import { designTokens } from "../../theme/designTokens";
import { getTabBarHeight } from "../../utils";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { linkingService } from "../../services/linking.service";
import { appendShareSignature } from "../../utils/shareMessage";
import { DownloadStatus } from "../../services/downloads/downloadQueue.service";
import { Loading, Text, Touchable } from "../atoms";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const MINI_PLAYER_HEIGHT = 72;

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
      togglePlayPause,
      expandPlayer,
      minimizePlayer,
      seekForward,
      seekBackward,
      closePlayer,
      setProgress,
      playbackSpeed,
      setPlaybackSpeed,
    } = usePlayerStore();
    const {
      addToQueue,
      pauseDownload,
      resumeDownload,
      getDownloadStatus,
      getDownloadProgress,
    } = useDownloadsStore();
    const { colors } = useTheme();

    // Fetch richer lecture metadata only when the player is expanded.
    const { lecture: lectureDetail } = useLectureDetail(
      isExpanded && currentEpisode ? currentEpisode.id : undefined,
    );

    const languageLabel = (lectureDetail?.language || currentEpisode?.language || "").trim();

    const releasedDateLabel = (() => {
      const raw = lectureDetail?.postedDate || currentEpisode?.createdAt;
      if (!raw) return "";
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    })();

    const topicsLabel = (Array.isArray(lectureDetail?.categories) ? lectureDetail.categories : [])
      .map((c) => String(c).trim())
      .filter(Boolean)
      .join(", ");

    const isRecitation = Boolean(
      lectureDetail?.isReciter ||
      lectureDetail?.reciter?.isReciter ||
      lectureDetail?.reciter?.id ||
      lectureDetail?.raw?.reciter_id
    );

    const contentTypeLabel = isRecitation ? "Quran Recitation" : "Islamic Lecture";

    const artistName = useMemo(
      () => (currentEpisode ? resolveEpisodeArtistName(currentEpisode) : ''),
      [currentEpisode],
    );

    const downloadStatus = currentEpisode ? getDownloadStatus(currentEpisode.id) : null;
    const downloadProgress = currentEpisode ? getDownloadProgress(currentEpisode.id) : 0;
    const isDownloading =
      downloadStatus === DownloadStatus.DOWNLOADING ||
      downloadStatus === DownloadStatus.QUEUED;

    const [imageError, setImageError] = useState(false);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const dragY = useSharedValue(0);
    const gestureStartY = useSharedValue(0);
    const isExpandedShared = useSharedValue(isExpanded ? 1 : 0);

    // Check if we're on a screen where the bottom tab bar is actually visible.
    // This should stay in sync with `shouldShowTabs` in `app/(tabs)/_layout.tsx`:
    // tabs are only visible on the main tab routes (Home, Library, Profile).
    const isTabScreen =
      pathname === "/" ||
      pathname === "/library" ||
      pathname === "/profile";

    const tabBarHeight = useMemo(() => getTabBarHeight(insets.bottom), [insets.bottom]);

    // Use shared values for reactive animation updates
    const insetsTopShared = useSharedValue(insets.top);
    const tabBarHeightShared = useSharedValue(tabBarHeight);
    const isTabScreenShared = useSharedValue(isTabScreen ? 1 : 0);

    // Update shared values when dependencies change
    useEffect(() => {
      insetsTopShared.value = insets.top;
      tabBarHeightShared.value = tabBarHeight;
      isTabScreenShared.value = isTabScreen ? 1 : 0;
    }, [insets.top, tabBarHeight, isTabScreen]);

    // Calculate expanded height reactively using derived value
    const expandedPlayerHeight = useDerivedValue(() => {
      return isTabScreenShared.value === 1
        ? screenHeight - tabBarHeightShared.value - insetsTopShared.value
        : screenHeight - insetsTopShared.value;
    });

    useEffect(() => {
      isExpandedShared.value = isExpanded ? 1 : 0;
    }, [isExpanded]);

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
      const currentExpandedHeight = expandedPlayerHeight.value;
      const height = interpolate(
        dragY.value,
        [0, 200],
        [currentExpandedHeight, MINI_PLAYER_HEIGHT],
        Extrapolate.CLAMP
      );

      return {
        height: withSpring(isExpandedShared.value === 1 ? height : MINI_PLAYER_HEIGHT),
        transform: [{ translateY: withSpring(translateY.value) }],
        opacity: opacity.value,
      };
    });

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

    const handleShare = async () => {
      if (!currentEpisode) return;

      const webLink = linkingService.createLectureLink(currentEpisode.id);
      const baseMessage = `🎧 ${currentEpisode.title}${artistName ? `\n👤 ${artistName}` : ''}\n\n${webLink}`;
      const message = appendShareSignature(baseMessage);

      try {
        await Share.share({
          title: currentEpisode.title,
          message,
          url: webLink, // iOS will use this for sharing
        });
      } catch (error) {
        console.warn("Failed to share lecture", error);
      }
    };

    const handleDownloadPress = async () => {
      if (!currentEpisode) return;

      try {
        if (downloadStatus === DownloadStatus.DOWNLOADING) {
          await pauseDownload(currentEpisode.id);
        } else if (downloadStatus === DownloadStatus.PAUSED) {
          await resumeDownload(currentEpisode.id);
        } else if (downloadStatus === DownloadStatus.COMPLETED) {
          // No-op; already downloaded
        } else {
          await addToQueue(currentEpisode);
        }
      } catch (error) {
        console.error("Failed to manage download", error);
      }
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
            <View style={[styles.progressTrack, { backgroundColor: colors.system.fill.quaternary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: colors.brand.primary,
                  },
                ]}
              />
              {/* Draggable Progress Thumb */}
              <View
                style={[
                  styles.miniProgressThumb,
                  {
                    left: `${progressPercentage}%`,
                    backgroundColor: colors.brand.primary,
                    shadowColor: colors.system.label.primary,
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
                    color: colors.fixed.white,
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
              {artistName ? `${artistName} • ` : ""}{formatDuration(progress)}/{formatDuration(duration)}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.miniControls}>
            {/* Play/Pause Button */}
            {isLoading ? (
              <View style={[styles.playButton, { backgroundColor: colors.system.fill.secondary }]}>
                <Loading size="small" />
              </View>
            ) : (
              <Touchable
                onPress={togglePlayPause}
                style={{ ...styles.playButton, backgroundColor: colors.system.fill.secondary }}
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
                accessibilityRole="button"
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color={colors.system.label.primary}
                />
              </Touchable>
            )}
          </View>
        </Pressable>
      </View>
    );

    const renderExpandedPlayer = () => (
      <GestureDetector gesture={expandedPanGesture}>
        <Animated.View style={styles.expandedPlayerContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={[styles.dragIndicator, { backgroundColor: colors.system.fill.quaternary }]} />
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
                color={colors.system.label.primary}
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
              onPress={handleClose}
              style={styles.minimizeButton}
              accessibilityLabel="Minimize player"
              accessibilityRole="button"
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.system.label.primary}
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
                      color: colors.fixed.white,
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
                {artistName}
              </Text>
              <Text
                variant="caption1"
                color="tertiaryLabel"
                style={{ textAlign: "center" }}
              >
                {`${contentTypeLabel}${languageLabel ? ` • ${languageLabel}` : ""}`}
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
                  <View style={[styles.progressSliderTrack, { backgroundColor: colors.system.fill.quaternary }]}>
                    <View
                      style={[
                        styles.progressSliderFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: colors.brand.primary,
                        },
                      ]}
                    />
                    <View
                      style={{
                        ...styles.progressThumb,
                        left: `${progressPercentage}%`,
                        backgroundColor: colors.brand.primary,
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
                  color={colors.system.label.primary}
                />
              </Touchable>

              {isLoading ? (
                <View style={[styles.mainPlayButton, { backgroundColor: colors.system.fill.secondary }]}>
                  <Loading size="large" />
                </View>
              ) : (
                <Touchable
                  onPress={togglePlayPause}
                  style={{ ...styles.mainPlayButton, backgroundColor: colors.system.fill.secondary }}
                  accessibilityLabel={isPlaying ? "Pause" : "Play"}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color={colors.system.label.primary}
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
                  color={colors.system.label.primary}
                />
              </Touchable>
            </View>

            {/* Secondary Controls */}
            <View style={styles.secondaryControls}>
              <Touchable
                onPress={() => {
                  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
                  const currentIndex = speeds.indexOf(playbackSpeed);
                  const nextIndex = (currentIndex + 1) % speeds.length;
                  setPlaybackSpeed(speeds[nextIndex]);
                }}
                style={styles.secondaryButton}
                accessibilityLabel={`Playback speed ${playbackSpeed}x`}
                accessibilityRole="button"
              >
                <Text variant="caption2" color="secondaryLabel" weight="bold">
                  {playbackSpeed}x
                </Text>
              </Touchable>

              <Touchable
                onPress={handleShare}
                style={styles.secondaryButton}
                accessibilityLabel="Share"
                accessibilityRole="button"
              >
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={colors.system.label.secondary}
                />
              </Touchable>

              <Touchable
                onPress={handleDownloadPress}
                style={styles.secondaryButton}
                accessibilityLabel={
                  downloadStatus === DownloadStatus.COMPLETED
                    ? "Downloaded"
                    : downloadStatus === DownloadStatus.DOWNLOADING
                      ? "Downloading..."
                      : downloadStatus === DownloadStatus.PAUSED
                        ? "Resume download"
                        : downloadStatus === DownloadStatus.QUEUED
                          ? "Queued"
                          : downloadStatus === DownloadStatus.FAILED
                            ? "Retry download"
                            : "Download"
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
                    name={
                      downloadStatus === DownloadStatus.COMPLETED
                        ? "checkmark-circle"
                        : downloadStatus === DownloadStatus.PAUSED
                          ? "play-circle-outline"
                          : downloadStatus === DownloadStatus.QUEUED
                            ? "time-outline"
                            : downloadStatus === DownloadStatus.FAILED
                              ? "alert-circle-outline"
                              : "download-outline"
                    }
                    size={24}
                    color={
                      downloadStatus === DownloadStatus.COMPLETED
                        ? colors.brand.primary
                        : downloadStatus === DownloadStatus.FAILED
                          ? colors.semantic.red
                          : colors.system.label.secondary
                    }
                  />
                )}
              </Touchable>
            </View>

            {/* Detailed Metadata Section */}
            <View style={[styles.metadataSection, { borderTopColor: colors.system.separator.primary }]}>
              {releasedDateLabel ? (
                <View style={styles.metadataRow}>
                  <View style={styles.metadataItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.system.label.tertiary}
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
                      {releasedDateLabel}
                    </Text>
                  </View>
                </View>
              ) : null}

              {languageLabel ? (
                <View style={styles.metadataRow}>
                  <View style={styles.metadataItem}>
                    <Ionicons
                      name="language-outline"
                      size={16}
                      color={colors.system.label.tertiary}
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
                      {languageLabel}
                    </Text>
                  </View>
                </View>
              ) : null}

              {lectureDetail?.albumName ? (
                <View style={styles.metadataRow}>
                  <View style={styles.metadataItem}>
                    <Ionicons
                      name="albums-outline"
                      size={16}
                      color={colors.system.label.tertiary}
                    />
                    <Text
                      variant="caption1"
                      color="tertiaryLabel"
                      style={{ marginLeft: 6 }}
                    >
                      Album
                    </Text>
                    <Text
                      variant="subheadline"
                      color="label"
                      style={{ marginLeft: 8 }}
                    >
                      {lectureDetail.albumName}
                    </Text>
                  </View>
                </View>
              ) : null}

              {topicsLabel ? (
                <View style={styles.metadataRow}>
                  <View style={styles.metadataItem}>
                    <Ionicons
                      name="pricetag-outline"
                      size={16}
                      color={colors.system.label.tertiary}
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
                      numberOfLines={2}
                    >
                      {topicsLabel}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    );

    return (
      <GestureHandlerRootView
        pointerEvents="box-none"
        style={[
          styles.container,
          {
            // Dynamically position based on whether we're on a tab screen
            // When tabs are visible, sit directly above the tab bar.
            // Avoid double-counting bottom insets (tabBarHeight already accounts for them).
            bottom: isTabScreen ? tabBarHeight : insets.bottom,
          },
        ]}
      >
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.player,
            {
              backgroundColor: colors.system.background.secondary,
              borderTopColor: colors.system.separator.primary,
              shadowColor: colors.system.label.primary,
            },
            animatedStyle,
          ]}
        >
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
    borderTopWidth: StyleSheet.hairlineWidth,
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
    justifyContent: "center",
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
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
