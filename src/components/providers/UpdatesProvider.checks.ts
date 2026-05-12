export const shouldThrottleUpdateCheck = (
  nowMs: number,
  lastCheckMs: number,
  intervalMs: number
): boolean => nowMs - lastCheckMs < intervalMs;

type LastCheckAfterAttemptInput = {
  previousLastCheckMs: number;
  nowMs: number;
  attemptSucceeded: boolean;
};

export const getLastCheckAfterAttempt = ({
  previousLastCheckMs,
  nowMs,
  attemptSucceeded,
}: LastCheckAfterAttemptInput): number => (
  attemptSucceeded ? nowMs : previousLastCheckMs
);
