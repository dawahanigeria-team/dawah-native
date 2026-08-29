import { apiClient } from './base.api';
import { premiumApi } from './premium.api';

jest.mock('./base.api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;

beforeEach(() => {
  mockPost.mockReset();
});

/**
 * normalizePremiumState maps fields explicitly rather than spreading the
 * response, so a new server field is silently dropped unless it is added
 * there too. That is not a hypothetical: the download counters shipped
 * missing from this mapper, which left the client believing every free user
 * still had all 5 downloads no matter how many they had taken.
 */
test('the server download counters survive normalization', async () => {
  mockPost.mockResolvedValue({
    data: {
      success: true,
      plan: 'free',
      subscription_status: 'inactive',
      feature_flags: { offline_download: false, can_download_more: false },
      download_count: 5,
      free_download_limit: 5,
      download_period: '2026-08',
    },
  });

  const state = await premiumApi.getUserFeatures();

  expect(state.download_count).toBe(5);
  expect(state.free_download_limit).toBe(5);
  expect(state.download_period).toBe('2026-08');
  expect(state.feature_flags.can_download_more).toBe(false);
});

test('a partially used allowance is reported as the server counted it', async () => {
  mockPost.mockResolvedValue({
    data: {
      plan: 'free',
      feature_flags: { offline_download: false, can_download_more: true },
      download_count: 3,
      free_download_limit: 5,
    },
  });

  const state = await premiumApi.getUserFeatures();

  expect(state.download_count).toBe(3);
  expect(state.feature_flags.can_download_more).toBe(true);
});

test('an older server that omits the counters falls back to the free defaults', async () => {
  // Deploy ordering: the app can reach a backend that predates the quota.
  // It must not crash, and must not hard-gate downloads on a missing field.
  mockPost.mockResolvedValue({
    data: { plan: 'free', feature_flags: { offline_download: false } },
  });

  const state = await premiumApi.getUserFeatures();

  expect(state.download_count).toBe(0);
  expect(state.free_download_limit).toBe(5);
  expect(state.feature_flags.can_download_more).toBe(true);
});
