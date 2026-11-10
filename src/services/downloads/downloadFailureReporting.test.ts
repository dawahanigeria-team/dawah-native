import { DownloadAuthRequiredError, DownloadLimitReachedError } from '../api/downloads.api';
import {
  DownloadCreationFailedError,
  DownloadFailedError,
  downloadFailureContext,
  shouldReportDownloadFailure,
} from './downloadFailureReporting';

jest.mock('../api/downloads.api', () => ({
  DownloadAuthRequiredError: class DownloadAuthRequiredError extends Error {},
  DownloadLimitReachedError: class DownloadLimitReachedError extends Error {},
}));

/**
 * A download failure used to reach Sentry two or three times: the layer that
 * raised it called logger.error (which captures), its own catch called
 * logger.error again on the way out, and the queue captured it a third time.
 * Counts on any download issue were inflated by the same bug reporting itself.
 */
describe('shouldReportDownloadFailure', () => {
  test('reports an ordinary failure', () => {
    expect(shouldReportDownloadFailure(new Error('Storage is full'))).toBe(true);
    expect(shouldReportDownloadFailure(new DownloadFailedError('HTTP 500'))).toBe(true);
  });

  test('stays quiet for refusals, which are outcomes rather than faults', () => {
    expect(shouldReportDownloadFailure(new DownloadAuthRequiredError('Sign in'))).toBe(false);
    expect(shouldReportDownloadFailure(new DownloadLimitReachedError('No downloads left', 5, 5))).toBe(
      false,
    );
  });

  test('stays quiet when creation already reported the real cause', () => {
    expect(shouldReportDownloadFailure(new DownloadCreationFailedError())).toBe(false);
  });
});

describe('downloadFailureContext', () => {
  test('carries the context the failing layer attached', () => {
    const error = new DownloadFailedError('Not found', {
      lectureId: '24298',
      status: 404,
    });

    expect(downloadFailureContext(error)).toEqual({ lectureId: '24298', status: 404 });
  });

  test('is empty for an error carrying nothing', () => {
    expect(downloadFailureContext(new DownloadFailedError('No context'))).toEqual({});
    expect(downloadFailureContext(new Error('Plain'))).toEqual({});
    expect(downloadFailureContext(undefined)).toEqual({});
  });
});
