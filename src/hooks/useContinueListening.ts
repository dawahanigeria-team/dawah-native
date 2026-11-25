import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { pickResumable } from "../features/resume/resumePosition";
import { type HistoryItem, historyService } from "../services/history.service";
import { Episode } from "../types/types";

export interface ContinueListeningItem {
  episode: Episode;
  positionSec: number;
}

const toEpisode = (item: HistoryItem): Episode => ({
  id: item.lectureId,
  title: item.title,
  lecturerName: item.lecturerName,
  durationSec: item.duration,
  coverUrl: item.coverUrl,
  audioUrl: item.audioUrl,
  seriesId: "",
  plays: 0,
  liked: false,
  language: item.language || "",
  downloads: 0,
  createdAt: item.playedAt,
});

/**
 * The lecture to offer on Home. Only a lecture that is playing right now is left out:
 * the last session's lecture is restored paused into the mini player at launch, and is
 * exactly the one to continue.
 */
export const useContinueListening = (
  currentLectureId: string | undefined,
  isPlaying: boolean,
): ContinueListeningItem | null => {
  const playingLectureId = isPlaying ? currentLectureId : undefined;
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void historyService.getHistory().then((items) => {
        if (active) setHistory(items);
      });
      return () => {
        active = false;
      };
      // Re-read when playback starts, pauses or changes lecture, since Home stays focused meanwhile.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playingLectureId]),
  );

  return useMemo(() => {
    const item = pickResumable(history, playingLectureId);
    return item ? { episode: toEpisode(item), positionSec: item.progress } : null;
  }, [history, playingLectureId]);
};
