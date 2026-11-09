import { useEntity } from "simpler-state";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { usePathname } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  GestureResponderEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  useWindowDimensions,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
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
import { useDownloadGate } from "../../hooks/useDownloadGate";
import { useLectureDetail } from "../../hooks/useLectureDetail";
import { useTheme } from "../../hooks/useTheme";
import { useDownloadsStore } from "../../stores";
import { playerStore, resolveEpisodeArtistName, usePlayerActions } from "../../stores/playerStore";
import { designTokens } from "../../theme/designTokens";
import { getTabBarHeight } from "../../utils/layout";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { linkingService } from "../../services/linking.service";
import { appendShareSignature } from "../../utils/shareMessage";
import { DownloadStatus } from "../../services/downloads/downloadQueue.service";
import { Loading } from "../atoms/Loading";
import { Text } from "../atoms/Text";
import { Touchable } from "../atoms/Touchable";
import { boxShadow } from "../../utils/shadow";
import { LectureRow } from "../molecules/LectureRow";
import { episodeToRow } from "../molecules/lectureRowModel";

const MINI_PLAYER_HEIGHT = 72;
const UP_NEXT_LIMIT = 5;

const formatClock = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Progress changes every second during playback. Reading it here, in leaf
// components, keeps the rest of the player from re-rendering with it.
const ProgressMarks: React.FC<{
  fillStyle: StyleProp<ViewStyle>;
  thumbStyle: StyleProp<ViewStyle>;
}> = ({ fillStyle, thumbStyle }) => {
  const percentage = useEntity(playerStore, (s) =>
    s.duration > 0 ? (s.progress / s.duration) * 100 : 0,
  );
  return (
    <>
      <View style={[fillStyle, { width: `${percentage}%` }]} />
      <View style={[thumbStyle, { left: `${percentage}%` }]} />
    </>
  );
};

const ClockText: React.FC<{ part: "elapsed" | "total" | "both" }> = ({ part }) => {
  const label = useEntity(playerStore, (s) =>
    part === "elapsed"
      ? formatClock(s.progress)
      : part === "total"
        ? formatClock(s.duration)
        : `${formatClock(s.progress)}/${formatClock(s.duration)}`,
  );
  return <>{label}</>;
};

interface MiniPlayerProps {
  onExpand?: () => void;
  onMinimize?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = memo(
  ({ onExpand, onMinimize }) => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    // Hook, not Dimensions.get(): the module-scope version was read once at
    // import and never updated, so the expanded player kept its original
    // height and the progress track its original width after a rotation or
    // split-view resize.
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const currentEpisode = useEntity(playerStore, (s) => s.currentEpisode);
    const isPlaying = useEntity(playerStore, (s) => s.isPlaying);
    const isExpanded = useEntity(playerStore, (s) => s.isExpanded);
    const isLoading = useEntity(playerStore, (s) => s.isLoading);
    const playbackSpeed = useEntity(playerStore, (s) => s.playbackSpeed ?? 1);
    const repeatMode = useEntity(playerStore, (s) => s.repeatMode ?? "off");
    const isShuffled = useEntity(playerStore, (s) => s.isShuffled);
    const queue = useEntity(playerStore, (s) => s.queue);
    const currentQueueIndex = useEntity(playerStore, (s) => s.currentQueueIndex);
    const sleepTimerEndsAt = useEntity(playerStore, (s) => s.sleepTimerEndsAt);
    const sleepTimerEndOfTrack = useEntity(playerStore, (s) => s.sleepTimerEndOfTrack);
    const {
      togglePlayPause,
      expandPlayer,
      minimizePlayer,
      seekForward,
      seekBackward,
      closePlayer,
      setProgress,
      setPlaybackSpeed,
      setRepeatMode,
      toggleShuffle,
      setSleepTimer,
      setSleepTimerEndOfTrack,
      clearSleepTimer,
      skipToQueueIndex,
    } = usePlayerActions();
    const {
      addToQueue,
      pauseDownload,
      resumeDownload,
      getDownloadStatus,
      getDownloadProgress,
    } = useDownloadsStore();
    const { requireDownloadAccess } = useDownloadGate();
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

    // Build content-type label from actual API categories instead of hardcoding
    const contentTypeLabel = topicsLabel || "";

    const downloadStatus = currentEpisode ? getDownloadStatus(currentEpisode.id) : null;
    const downloadProgress = currentEpisode ? getDownloadProgress(currentEpisode.id) : 0;
    const isDownloading =
      downloadStatus === DownloadStatus.DOWNLOADING ||
      downloadStatus === DownloadStatus.QUEUED;

    const [imageError, setImageError] = useState(false);
    const [miniProgressTrackWidth, setMiniProgressTrackWidth] = useState(screenWidth);
    const [expandedProgressTrackWidth, setExpandedProgressTrackWidth] = useState(280);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const dragY = useSharedValue(0);
    const gestureStartY = useSharedValue(0);
    const isExpandedShared = useSharedValue(isExpanded ? 1 : 0);

    // Check if we're on a screen where the bottom tab bar is actually visible.
    // This should stay in sync with `shouldShowTabs` in `app/(tabs)/_layout.tsx`:
    // tabs are only visible on the main tab routes (Home, Explore, Library, Profile).
    const isTabScreen =
      pathname === "/" ||
      pathname === "/explore" ||
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
    // screenHeight is a plain JS value captured by the worklet, not a shared
    // value, so it is listed explicitly — otherwise the derived height could
    // keep using the pre-rotation screen size.
    const expandedPlayerHeight = useDerivedValue(() => {
      return isTabScreenShared.value === 1
        ? screenHeight - tabBarHeightShared.value - insetsTopShared.value
        : screenHeight - insetsTopShared.value;
    }, [screenHeight]);

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

    const updateProgressFromTouch = useCallback(
      (event: GestureResponderEvent, trackWidth: number) => {
        const duration = playerStore.get().duration;
        if (!duration || trackWidth <= 0) return;
        const touchX = event.nativeEvent.locationX;
        const nextProgress = Math.max(
          0,
          Math.min(duration, (touchX / trackWidth) * duration)
        );
        setProgress(nextProgress);
      },
      [setProgress]
    );

    const handleMiniProgressTouch = useCallback(
      (event: GestureResponderEvent) => {
        updateProgressFromTouch(event, miniProgressTrackWidth);
      },
      [miniProgressTrackWidth, updateProgressFromTouch]
    );

    const handleExpandedProgressTouch = useCallback(
      (event: GestureResponderEvent) => {
        updateProgressFromTouch(event, expandedProgressTrackWidth);
      },
      [expandedProgressTrackWidth, updateProgressFromTouch]
    );

    // Don't render if no episode is playing
    const upcoming = useMemo(
      () =>
        isExpanded
          ? queue
              .map((episode, index) => ({ episode, index }))
              .filter(({ index }) => index > currentQueueIndex)
          : [],
      [isExpanded, queue, currentQueueIndex],
    );

    if (!currentEpisode) {
      return null;
    }

    // Resolve the display name: filters out placeholders like "DawahNigeria"
    // and picks the best available name (rpname, reciter_name, etc.)
    const displayArtistName = resolveEpisodeArtistName(currentEpisode);

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

    // Minutes offered by the picker. Kept short at the front because the
    // common case is "I am already falling asleep", not planning an hour.
    const SLEEP_TIMER_MINUTES = [5, 15, 30, 45, 60];

    const isSleepTimerArmed = Boolean(sleepTimerEndsAt) || sleepTimerEndOfTrack;

    // Minutes left, rounded up so it never reads "0 min" while still counting.
    const sleepMinutesRemaining = sleepTimerEndsAt
      ? Math.max(0, Math.ceil((sleepTimerEndsAt - Date.now()) / 60_000))
      : null;

    const handleSleepTimerPress = () => {
      // Armed timer: one tap cancels rather than making the user hunt for an
      // "off" row in the picker.
      if (isSleepTimerArmed) {
        clearSleepTimer();
        return;
      }

      const labels = [
        ...SLEEP_TIMER_MINUTES.map((m) => `${m} minutes`),
        "End of this lecture",
      ];

      const apply = (index: number) => {
        if (index < SLEEP_TIMER_MINUTES.length) {
          setSleepTimer(SLEEP_TIMER_MINUTES[index]);
        } else {
          setSleepTimerEndOfTrack();
        }
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: "Sleep timer",
            options: [...labels, "Cancel"],
            cancelButtonIndex: labels.length,
          },
          (index) => {
            if (index < labels.length) apply(index);
          }
        );
        return;
      }

      // Android has no action sheet primitive. Alert caps out at three
      // buttons on older versions, so the options are listed in the message
      // and chosen from a compact set rather than rendering one button each.
      Alert.alert("Sleep timer", "Stop playback after…", [
        { text: "15 min", onPress: () => setSleepTimer(15) },
        { text: "30 min", onPress: () => setSleepTimer(30) },
        { text: "End of lecture", onPress: setSleepTimerEndOfTrack },
      ]);
    };

    const handleShare = async () => {
      if (!currentEpisode) return;

      const webLink = linkingService.createLectureLink(currentEpisode.id);
      const baseMessage = `🎧 ${currentEpisode.title}\n👤 ${displayArtistName || currentEpisode.lecturerName || 'Unknown'}\n\n${webLink}`;
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
      if (!requireDownloadAccess(`/lecture/${currentEpisode.id}`)) return;

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

    const renderMiniPlayer = () => (
      <View style={styles.miniPlayerContainer}>
        {/* Progress Bar with Draggable Thumb */}
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.system.fill.quaternary }]}
            onLayout={(event) => {
              setMiniProgressTrackWidth(event.nativeEvent.layout.width);
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleMiniProgressTouch}
            onResponderMove={handleMiniProgressTouch}
          >
            <ProgressMarks
              fillStyle={[styles.progressFill, { backgroundColor: colors.brand.primary }]}
              thumbStyle={[
                styles.miniProgressThumb,
                {
                  backgroundColor: colors.brand.primary,
                  boxShadow: boxShadow(colors.system.label.primary, 0.3, 2, 1, 0),
                },
              ]}
            />
          </View>
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
              {displayArtistName ? `${displayArtistName} • ` : ""}<ClockText part="both" />
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
              accessibilityLabel="Close player"
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
                {displayArtistName}
              </Text>
              <Text
                variant="caption1"
                color="tertiaryLabel"
                style={{ textAlign: "center" }}
              >
                {[contentTypeLabel, languageLabel].filter(Boolean).join(" • ")}
              </Text>
            </View>

            {/* Progress Slider */}
            <View style={styles.progressSliderContainer}>
              <View style={styles.progressSlider}>
                <View
                  style={[styles.progressSliderTrack, { backgroundColor: colors.system.fill.quaternary }]}
                  onLayout={(event) => {
                    setExpandedProgressTrackWidth(event.nativeEvent.layout.width);
                  }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={handleExpandedProgressTouch}
                  onResponderMove={handleExpandedProgressTouch}
                >
                  <ProgressMarks
                    fillStyle={[styles.progressSliderFill, { backgroundColor: colors.brand.primary }]}
                    thumbStyle={[styles.progressThumb, { backgroundColor: colors.brand.primary }]}
                  />
                </View>
              </View>
              <View style={styles.timeLabels}>
                <Text variant="caption2" color="secondaryLabel">
                  <ClockText part="elapsed" />
                </Text>
                <Text variant="caption2" color="secondaryLabel">
                  <ClockText part="total" />
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

              {/* Shuffle and repeat were already implemented in the store and
                  persisted with the queue, but had no control anywhere in the
                  app — the only way to reach either was to already be in the
                  state. Both are surfaced here rather than in a submenu since
                  they change what plays next and belong beside the transport. */}
              <Touchable
                onPress={toggleShuffle}
                style={styles.secondaryButton}
                accessibilityLabel={isShuffled ? "Shuffle on" : "Shuffle off"}
                accessibilityRole="button"
                accessibilityState={{ selected: isShuffled }}
              >
                <Ionicons
                  name="shuffle"
                  size={24}
                  color={
                    isShuffled
                      ? colors.brand.primary
                      : colors.system.label.secondary
                  }
                />
              </Touchable>

              <Touchable
                // off -> all -> one -> off. Matches the order the store's
                // playNext() already handles, so the cycle cannot land the
                // queue in a mode playback does not implement.
                onPress={() =>
                  setRepeatMode(
                    repeatMode === "off"
                      ? "all"
                      : repeatMode === "all"
                        ? "one"
                        : "off"
                  )
                }
                style={styles.secondaryButton}
                accessibilityLabel={
                  repeatMode === "one"
                    ? "Repeat this lecture"
                    : repeatMode === "all"
                      ? "Repeat queue"
                      : "Repeat off"
                }
                accessibilityRole="button"
                accessibilityState={{ selected: repeatMode !== "off" }}
              >
                {/* Ionicons has no repeat-one glyph, so the active mode is
                    shown by tinting plus a small 1 rather than a second icon. */}
                <View>
                  <Ionicons
                    name="repeat"
                    size={24}
                    color={
                      repeatMode !== "off"
                        ? colors.brand.primary
                        : colors.system.label.secondary
                    }
                  />
                  {repeatMode === "one" && (
                    <Text
                      variant="caption2"
                      weight="bold"
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        color: colors.brand.primary,
                      }}
                    >
                      1
                    </Text>
                  )}
                </View>
              </Touchable>

              <Touchable
                onPress={handleSleepTimerPress}
                style={styles.secondaryButton}
                accessibilityLabel={
                  sleepTimerEndOfTrack
                    ? "Sleep timer on, stops at end of lecture. Tap to cancel"
                    : sleepMinutesRemaining !== null
                      ? `Sleep timer on, ${sleepMinutesRemaining} minutes left. Tap to cancel`
                      : "Set sleep timer"
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isSleepTimerArmed }}
              >
                {sleepMinutesRemaining !== null ? (
                  // Show the remaining minutes rather than a generic icon, so
                  // the timer can be read at a glance without opening anything.
                  <Text variant="caption2" weight="bold" style={{ color: colors.brand.primary }}>
                    {sleepMinutesRemaining}m
                  </Text>
                ) : (
                  <Ionicons
                    name="moon-outline"
                    size={24}
                    color={
                      sleepTimerEndOfTrack
                        ? colors.brand.primary
                        : colors.system.label.secondary
                    }
                  />
                )}
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

            {upcoming.length > 0 && (
              <View style={styles.upNextSection}>
                <Text variant="title3" accessibilityRole="header" style={styles.upNextHeading}>
                  Up next
                </Text>
                {upcoming.slice(0, UP_NEXT_LIMIT).map(({ episode, index }) => (
                  <LectureRow
                    key={`up-next-${episode.id}-${index}`}
                    lecture={episodeToRow(episode)}
                    onPress={() => void skipToQueueIndex(index)}
                  />
                ))}
                {upcoming.length > UP_NEXT_LIMIT && (
                  <Text variant="footnote" color="secondaryLabel" align="center" style={styles.upNextMore}>
                    {upcoming.length - UP_NEXT_LIMIT} more after these
                  </Text>
                )}
              </View>
            )}

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
              boxShadow: boxShadow(colors.system.label.primary, 0.1, 8, -2, 0),
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
    // Shadow moved to the merge site: boxShadow needs the opacity folded into
    // the colour, and the colour is a theme value only available there.
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
    marginLeft: -5, // Center the thumb on the progress line
    // Shadow moved to the merge site — see `player` above.
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
    marginLeft: -8, // Center the thumb on the progress line
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
    // Row grew from three controls to six (speed, shuffle, repeat, sleep,
    // share, download). Each button is 44pt wide, so the margin is what
    // decides whether the row fits: at spacing.lg six would need 456pt and at
    // sm 360pt, both wider than a 375pt phone once container padding is taken
    // off. xs lands at 312pt and leaves the 44pt hit target untouched.
    marginHorizontal: designTokens.spacing.xs,
  },
  downloadProgress: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Metadata Section Styles
  upNextSection: {
    alignSelf: "stretch",
    marginTop: designTokens.spacing.lg,
  },
  upNextHeading: {
    marginBottom: designTokens.spacing.xs,
  },
  upNextMore: {
    paddingVertical: designTokens.spacing.md,
  },
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
