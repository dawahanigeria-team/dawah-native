import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatTimeLeft } from "../../features/resume/resumePosition";
import { designTokens, spacing } from "../../theme/designTokens";
import { Episode } from "../../types/types";
import { Text } from "../atoms/Text";

// The card keeps its forest background in both themes, so its colours are fixed.
const ACCENT = designTokens.colorsDark.brand.primary;
const ON_ACCENT = designTokens.colorsDark.brand.onPrimary;
const ON_HERO = "#FFFFFF";
const ON_HERO_MUTED = "#E3EDDD";
const GRADIENT = ["#0F4A3C", "#1F6B3E"] as const;

interface ContinueHeroProps {
  episode: Episode;
  positionSec: number;
  onResume: () => void;
  onOpen: () => void;
}

export const ContinueHero: React.FC<ContinueHeroProps> = memo(
  ({ episode, positionSec, onResume, onOpen }) => {
    const duration = episode.durationSec;
    const timeLeft = formatTimeLeft(positionSec, duration);
    const percent = duration > 0 ? Math.min(100, (positionSec / duration) * 100) : 0;

    return (
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={styles.motif} accessible={false}>
          <View style={styles.motifSquare} />
          <View style={[styles.motifSquare, styles.motifDiamond]} />
        </View>

        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open ${episode.title}`}
        >
          <Text variant="footnote" weight="semibold" style={styles.eyebrow}>
            Continue listening
          </Text>
          <Text variant="title1" numberOfLines={2} style={styles.title}>
            {episode.title}
          </Text>
          {episode.lecturerName ? (
            <Text variant="subheadline" numberOfLines={1} style={styles.muted}>
              {episode.lecturerName}
            </Text>
          ) : null}
        </Pressable>

        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
        >
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text variant="footnote" style={styles.muted}>
          {timeLeft}
        </Text>

        <Pressable
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel={`Resume ${episode.title}, ${timeLeft}`}
          style={({ pressed }) => [styles.resume, pressed && styles.pressed]}
        >
          <Ionicons name="play" size={20} color={ON_ACCENT} />
          <Text variant="headline" style={{ color: ON_ACCENT }}>
            Resume
          </Text>
        </Pressable>
      </LinearGradient>
    );
  },
);

ContinueHero.displayName = "ContinueHero";

const MOTIF_SIZE = 190;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: 22,
    overflow: "hidden",
    gap: spacing.sm,
  },
  motif: {
    position: "absolute",
    top: -50,
    right: -60,
    width: MOTIF_SIZE,
    height: MOTIF_SIZE,
  },
  motifSquare: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  motifDiamond: {
    transform: [{ rotate: "45deg" }],
  },
  eyebrow: {
    color: "#DDF3A8",
    marginBottom: spacing.xs,
  },
  title: {
    color: ON_HERO,
    marginBottom: spacing.xs,
  },
  muted: {
    color: ON_HERO_MUTED,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  fill: {
    height: 4,
    backgroundColor: ACCENT,
  },
  resume: {
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
  },
});
