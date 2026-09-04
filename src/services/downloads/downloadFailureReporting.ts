import { DownloadAuthRequiredError, DownloadLimitReachedError } from '../api/downloads.api';

/**
 * A download failure whose cause is already understood at the point it is
 * raised. The context travels with the error so the queue - the single place
 * that reports download failures to Sentry - can attach it, instead of the
 * failing layer filing an event of its own.
 */
export class DownloadFailedError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DownloadFailedError';
  }
}

/**
 * createDownload returning null means it already reported the real cause, with
 * more context than the queue has. Thrown so the download still fails visibly,
 * and excluded from reporting so the same failure is not filed twice.
 */
export class DownloadCreationFailedError extends Error {
  constructor(message = 'Failed to create download.') {
    super(message);
    this.name = 'DownloadCreationFailedError';
  }
}

/**
 * Download failures reach Sentry exactly once, from the queue.
 *
 * A refusal is an outcome, not a fault: signing out or spending the monthly
 * allowance would otherwise file one issue per queued item.
 */
export const shouldReportDownloadFailure = (error: unknown): boolean => (
  !(error instanceof DownloadAuthRequiredError) &&
  !(error instanceof DownloadLimitReachedError) &&
  !(error instanceof DownloadCreationFailedError)
);

/** Context the failing layer attached, so reporting does not lose it. */
export const downloadFailureContext = (error: unknown): Record<string, unknown> => (
  error instanceof DownloadFailedError && error.context ? error.context : {}
);
