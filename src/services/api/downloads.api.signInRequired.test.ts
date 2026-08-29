import { apiClient } from './base.api';
import {
  downloadsApi,
  DownloadAuthRequiredError,
  DownloadLimitReachedError,
} from './downloads.api';

jest.mock('./base.api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('../../stores/premiumStore', () => ({
  applyDownloadUsage: jest.fn(),
}));

const mockPost = apiClient.post as jest.Mock;

beforeEach(() => {
  mockPost.mockReset();
});

/**
 * download_api.php refuses anonymous callers so the media URLs are never
 * handed to someone we cannot attribute a download to. The client has to tell
 * that refusal apart from a network failure: the UI offers sign-in for one and
 * "try again" for the other, and only one of them belongs in Sentry.
 */
test('a 401 AUTH_REQUIRED becomes a sign-in error, not a generic failure', async () => {
  mockPost.mockRejectedValue({
    status: 401,
    data: { code: 'AUTH_REQUIRED', message: 'An access token is required to download. Please sign in.' },
  });

  await expect(downloadsApi.incrementDownloadCounter('1234')).rejects.toBeInstanceOf(
    DownloadAuthRequiredError,
  );
});

/**
 * TOKEN_EXPIRED only reaches this layer after base.api has already tried a
 * refresh and failed, so it means the same thing to the user.
 */
test('an unrecoverable TOKEN_EXPIRED lands on the same sign-in error', async () => {
  mockPost.mockRejectedValue({
    status: 401,
    data: { code: 'TOKEN_EXPIRED', message: 'Your access token has expired. Please sign in again to download.' },
  });

  await expect(downloadsApi.incrementDownloadCounter('1234')).rejects.toBeInstanceOf(
    DownloadAuthRequiredError,
  );
});

/** The pre-existing quota refusal must keep its own type. */
test('the monthly limit refusal is still distinct from the sign-in refusal', async () => {
  mockPost.mockRejectedValue({
    status: 403,
    data: { code: 'DOWNLOAD_LIMIT_REACHED', message: 'used all 5', download_count: 5, free_download_limit: 5 },
  });

  const failure = await downloadsApi
    .incrementDownloadCounter('1234')
    .catch((e: unknown) => e);

  expect(failure).toBeInstanceOf(DownloadLimitReachedError);
  expect(failure).not.toBeInstanceOf(DownloadAuthRequiredError);
});

/** A genuine transport failure must not be dressed up as a sign-in problem. */
test('a network failure is left alone', async () => {
  mockPost.mockRejectedValue(new Error('Network request failed'));

  const failure = await downloadsApi
    .incrementDownloadCounter('1234')
    .catch((e: unknown) => e);

  expect(failure).not.toBeInstanceOf(DownloadAuthRequiredError);
  expect(failure).not.toBeInstanceOf(DownloadLimitReachedError);
});
