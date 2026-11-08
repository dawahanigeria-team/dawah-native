/** Fewer seconds than this is a sample, not a lecture someone is partway through. */
const MIN_LISTENED_SECONDS = 30;
/** This close to the end, the closing dua is all that is left, so it counts as finished. */
const FINISHED_WITHIN_SECONDS = 60;

export interface ResumableItem {
  lectureId: string;
  duration: number;
  progress: number;
}

/** Where playback should restart, or 0 when the lecture should start from the top. */
export const resumePosition = (progress: number, duration: number): number => {
  if (!Number.isFinite(progress) || progress < MIN_LISTENED_SECONDS) return 0;
  if (duration > 0 && progress >= duration - FINISHED_WITHIN_SECONDS) return 0;
  return progress;
};

/** History is newest first, so the first resumable item is the one to continue. */
export const pickResumable = <T extends ResumableItem>(
  history: readonly T[],
  excludeLectureId?: string,
): T | undefined =>
  history.find(
    (item) =>
      item.lectureId !== excludeLectureId && resumePosition(item.progress, item.duration) > 0,
  );

const formatMinutes = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
};

export const formatTimeLeft = (progress: number, duration: number): string =>
  duration > 0
    ? `${formatMinutes(duration - progress)} left of ${formatMinutes(duration)}`
    : `${formatMinutes(progress)} listened`;
