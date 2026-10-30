export const PROGRESS_WRITE_INTERVAL_MS = 1000;
export const PROGRESS_JUMP_SECONDS = 2;

interface ProgressWriteInput {
  currentTime: number;
  storedProgress: number;
  nowMs: number;
  lastWriteMs: number;
  episodeId: string | null;
  lastWriteEpisodeId: string | null;
}

/**
 * The native player reports position four times a second. The store only needs
 * it once a second, but a seek, a restart or a new track has to show at once.
 */
export const shouldWriteProgress = ({
  currentTime,
  storedProgress,
  nowMs,
  lastWriteMs,
  episodeId,
  lastWriteEpisodeId,
}: ProgressWriteInput): boolean => {
  if (episodeId !== lastWriteEpisodeId) return true;
  if (currentTime === 0 || currentTime < storedProgress) return true;
  if (currentTime - storedProgress > PROGRESS_JUMP_SECONDS) return true;
  return nowMs - lastWriteMs >= PROGRESS_WRITE_INTERVAL_MS;
};
