import { useRouter } from "expo-router";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useEntity } from "simpler-state";

import { playerStore, usePlayerActions } from "../../stores/playerStore";
import { designTokens } from "../../theme/designTokens";
import { Text } from "../atoms/Text";
import { LectureRow } from "../molecules/LectureRow";
import { episodeToRow } from "../molecules/lectureRowModel";

const UP_NEXT_LIMIT = 5;

/** What plays after `lectureId`, shown only while that lecture is the one playing. */
export const UpNext: React.FC<{ lectureId: string }> = memo(({ lectureId }) => {
  const router = useRouter();
  const queue = useEntity(playerStore, (s) => s.queue);
  const currentIndex = useEntity(playerStore, (s) => s.currentQueueIndex);
  const currentId = useEntity(playerStore, (s) => s.currentEpisode?.id);
  const { skipToQueueIndex } = usePlayerActions();

  if (String(currentId) !== String(lectureId)) return null;
  const upcoming = queue
    .map((episode, index) => ({ episode, index }))
    .filter(({ index }) => index > currentIndex);
  if (upcoming.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="title3" accessibilityRole="header" style={styles.heading}>
        Up next
      </Text>
      {upcoming.slice(0, UP_NEXT_LIMIT).map(({ episode, index }) => (
        <LectureRow
          key={`up-next-${episode.id}-${index}`}
          lecture={episodeToRow(episode)}
          onPress={() => {
            void skipToQueueIndex(index);
            // This screen shows the playing lecture, so it follows the jump.
            router.replace(`/lecture/${episode.id}`);
          }}
        />
      ))}
      {upcoming.length > UP_NEXT_LIMIT && (
        <Text variant="footnote" color="secondaryLabel" align="center" style={styles.more}>
          {upcoming.length - UP_NEXT_LIMIT} more after these
        </Text>
      )}
    </View>
  );
});

UpNext.displayName = "UpNext";

const styles = StyleSheet.create({
  section: {
    marginTop: designTokens.spacing.xl,
  },
  heading: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xs,
  },
  more: {
    paddingVertical: designTokens.spacing.md,
  },
});
