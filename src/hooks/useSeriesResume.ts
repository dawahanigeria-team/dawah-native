import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  countFinished,
  findSeriesResume,
  type SeriesResume,
} from "../features/resume/resumePosition";
import { type HistoryItem, historyService } from "../services/history.service";

interface SeriesResumeState {
  resume: SeriesResume | null;
  finishedCount: number;
}

/** Where to pick a series back up. `lectureIds` must be in play order. */
export const useSeriesResume = (lectureIds: readonly string[]): SeriesResumeState => {
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

  return useMemo(
    () => ({
      resume: findSeriesResume(lectureIds, history),
      finishedCount: countFinished(lectureIds, history),
    }),
    [lectureIds, history],
  );
};
