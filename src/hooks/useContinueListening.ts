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

export interface LoadedLecture {
  id?: string;
  /** Playing or loading: the mini player already covers it. */
  active: boolean;
  /** The player's own position, which a paused seek updates without touching history. */
  progress: number;
}

/**
 * The lecture to offer on Home. Only a lecture that is playing or loading is left out:
 * the last session's lecture is restored paused into the mini player at launch, and is
 * exactly the one to continue.
 */
export const useContinueListening = (loaded: LoadedLecture): ContinueListeningItem | null => {
  const activeLectureId = loaded.active ? loaded.id : undefined;
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
    }, [activeLectureId, loaded.id]),
  );

  return useMemo(() => {
    const current = history.map((item) =>
      item.lectureId === loaded.id && loaded.progress > 0
        ? { ...item, progress: loaded.progress }
        : item,
    );
    const item = pickResumable(current, activeLectureId);
    return item ? { episode: toEpisode(item), positionSec: item.progress } : null;
  }, [history, activeLectureId, loaded.id, loaded.progress]);
};
