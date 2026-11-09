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

/** The lecture to offer on Home. The one already in the mini player is left out. */
export const useContinueListening = (
  currentLectureId?: string,
): ContinueListeningItem | null => {
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
    }, []),
  );

  return useMemo(() => {
    const item = pickResumable(history, currentLectureId);
    return item ? { episode: toEpisode(item), positionSec: item.progress } : null;
  }, [history, currentLectureId]);
};
