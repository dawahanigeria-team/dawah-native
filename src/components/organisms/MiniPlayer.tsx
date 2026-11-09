import { useEntity } from "simpler-state";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Pressable,
  useWindowDimensions,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";
import { playerStore, resolveEpisodeArtistName, usePlayerActions } from "../../stores/playerStore";
import { designTokens } from "../../theme/designTokens";
import { getTabBarHeight } from "../../utils/layout";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { Loading } from "../atoms/Loading";
import { Text } from "../atoms/Text";
import { Touchable } from "../atoms/Touchable";
import { boxShadow } from "../../utils/shadow";

const MINI_PLAYER_HEIGHT = 72;

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
}

export const MiniPlayer: React.FC<MiniPlayerProps> = memo(
  ({ onExpand }) => {
    const pathname = usePathname();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    // Hook, not Dimensions.get(): the module-scope version was read once at
    // import and never updated after a rotation or split-view resize.
    const { width: screenWidth } = useWindowDimensions();
    const currentEpisode = useEntity(playerStore, (s) => s.currentEpisode);
    const isPlaying = useEntity(playerStore, (s) => s.isPlaying);
    const isLoading = useEntity(playerStore, (s) => s.isLoading);
    const { togglePlayPause, closePlayer, setProgress } = usePlayerActions();
    const { colors } = useTheme();

    const [imageError, setImageError] = useState(false);
    const [miniProgressTrackWidth, setMiniProgressTrackWidth] = useState(screenWidth);
    const opacity = useSharedValue(1);

    // Check if we're on a screen where the bottom tab bar is actually visible.
    // This should stay in sync with `shouldShowTabs` in `app/(tabs)/_layout.tsx`:
    // tabs are only visible on the main tab routes (Home, Explore, Library, Profile).
    const isTabScreen =
      pathname === "/" ||
      pathname === "/explore" ||
      pathname === "/library" ||
      pathname === "/profile";

    const tabBarHeight = useMemo(() => getTabBarHeight(insets.bottom), [insets.bottom]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    const handleMiniProgressTouch = useCallback(
      (event: GestureResponderEvent) => {
        const duration = playerStore.get().duration;
        if (!duration || miniProgressTrackWidth <= 0) return;
        const touchX = event.nativeEvent.locationX;
        setProgress(Math.max(0, Math.min(duration, (touchX / miniProgressTrackWidth) * duration)));
      },
      [miniProgressTrackWidth, setProgress]
    );

    if (!currentEpisode) {
      return null;
    }

    // Resolve the display name: filters out placeholders like "DawahNigeria"
    // and picks the best available name (rpname, reciter_name, etc.)
    const displayArtistName = resolveEpisodeArtistName(currentEpisode);

    // The full player is the lecture screen, so tapping the bar opens it.
    const handleExpand = () => {
      router.push(`/lecture/${currentEpisode.id}`);
      onExpand?.();
    };

    const handleClose = () => {
      opacity.set(withTiming(0, { duration: 200 }, () => {
        runOnJS(closePlayer)();
      }));
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
            {/* The expanded player used to be the only way to stop and dismiss playback. */}
            <Touchable
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="Close player"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={colors.system.label.secondary} />
            </Touchable>
          </View>
        </Pressable>
      </View>
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
          {renderMiniPlayer()}
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
  closeButton: {
    width: designTokens.hitTargets.minimum,
    height: designTokens.hitTargets.minimum,
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

});

MiniPlayer.displayName = "MiniPlayer";
