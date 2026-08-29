/**
 * Decides what the lecturer screen shows where the lecture list would go.
 *
 * The screen used to infer this from three loose values, and a request that was
 * cancelled rather than answered landed in the same branch as a scholar who
 * genuinely has no lectures — a dead end with no way back. Keeping the decision
 * here makes it testable and keeps the two cases apart.
 */

export type LecturesListState =
  | { kind: "loading" }
  | { kind: "error"; message: string; canRetry: true }
  | { kind: "empty" }
  | { kind: "list" };

export interface LecturesListInputs {
  /** Rows currently on screen — already filtered when the user is searching. */
  count: number;
  /** A first-page fetch is in flight. */
  isLoading: boolean;
  /** Set only when a request failed for a reason the user should see. */
  error: string | null;
  /** True once a request has completed and returned a readable body. */
  hasSettled: boolean;
  /** The user is filtering, so "nothing here" means "nothing matched". */
  isSearching: boolean;
}

/**
 * Shown when a request started but never delivered an answer. Worded as an
 * interruption rather than a failure: on a hand-off between masts that is
 * exactly what happened, and it keeps the retry affordance honest.
 */
export const LECTURES_INTERRUPTED_MESSAGE =
  "We couldn't finish loading this scholar's lectures.";

export function resolveLecturesListState(
  inputs: LecturesListInputs,
): LecturesListState {
  const { count, isLoading, error, hasSettled, isSearching } = inputs;

  if (isLoading) return { kind: "loading" };
  if (error) return { kind: "error", message: error, canRetry: true };
  if (count > 0) return { kind: "list" };

  // Search filters rows we already hold, so an empty result is a real answer
  // about the query and never means the fetch is outstanding.
  if (isSearching) return { kind: "empty" };

  // No rows, no error, and nothing ever came back: we have not earned the
  // claim that this scholar has no lectures.
  if (!hasSettled) {
    return {
      kind: "error",
      message: LECTURES_INTERRUPTED_MESSAGE,
      canRetry: true,
    };
  }

  return { kind: "empty" };
}
