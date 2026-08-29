import { authStore, subscribeToAuthChange } from './authStore';

jest.mock('../services/api/auth.api', () => ({ authApi: {} }));
jest.mock('../services/user.service', () => ({ userService: {} }));
jest.mock('../services/cache/cache.service', () => ({ cacheService: {} }));
jest.mock('../services/history.service', () => ({ historyService: {} }));
jest.mock('../services/api/base.api', () => ({ apiClient: {} }));
jest.mock('./favoritesStore', () => ({ clearFavorites: jest.fn() }));
jest.mock('./premiumStore', () => ({
  hydratePremiumFromUser: jest.fn(),
  refreshPremiumFeatures: jest.fn(),
  resetPremiumState: jest.fn(),
}));
jest.mock('./listeningPreferencesStore', () => ({
  clearListeningPreferencesForSignedOutSession: jest.fn(),
}));

const signedOut = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
};

beforeEach(() => {
  authStore.set(signedOut);
});

/**
 * The download queue holds every queued item while signed out, so something
 * has to release it again. simpler-state entities only expose a React hook,
 * and the queue is not a component.
 */
test('a subscriber hears the transition into signed in', () => {
  const listener = jest.fn();
  subscribeToAuthChange(listener);

  authStore.set(prev => ({ ...prev, isAuthenticated: true }));

  expect(listener).toHaveBeenCalledWith(true);
});

test('and the transition back out', () => {
  authStore.set(prev => ({ ...prev, isAuthenticated: true }));

  const listener = jest.fn();
  subscribeToAuthChange(listener);
  authStore.set(prev => ({ ...prev, isAuthenticated: false }));

  expect(listener).toHaveBeenCalledWith(false);
});

/**
 * `set` runs on every loading flag and profile edit. Firing on those would
 * make the queue reprocess constantly for no reason.
 */
test('unrelated writes do not wake subscribers', () => {
  const listener = jest.fn();
  subscribeToAuthChange(listener);

  authStore.set(prev => ({ ...prev, isLoading: true }));
  authStore.set(prev => ({ ...prev, error: 'nope' }));
  authStore.set(prev => ({ ...prev, isInitialized: true }));

  expect(listener).not.toHaveBeenCalled();
});

/**
 * The real login path writes to the store three times: isLoading, then the
 * token-change listener flipping isAuthenticated, then the full user object
 * with isAuthenticated: true again. Only the middle one is a transition, and
 * the subscriber kicks off a queue pass - so firing on all three would triple
 * the work on every sign-in.
 */
test('one sign-in is one notification, not one per write', () => {
  const listener = jest.fn();
  subscribeToAuthChange(listener);

  authStore.set(prev => ({ ...prev, isLoading: true }));
  authStore.set(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
  authStore.set({
    user: { id: '1' } as never,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    isInitialized: true,
  });

  expect(listener).toHaveBeenCalledTimes(1);
});

test('unsubscribing stops the notifications', () => {
  const listener = jest.fn();
  const unsubscribe = subscribeToAuthChange(listener);
  unsubscribe();

  authStore.set(prev => ({ ...prev, isAuthenticated: true }));

  expect(listener).not.toHaveBeenCalled();
});

/**
 * The new state is committed before listeners run, so a throwing subscriber
 * must not be able to take it back out or silence the ones behind it.
 */
test('a throwing subscriber does not corrupt auth state or block the others', () => {
  const after = jest.fn();
  subscribeToAuthChange(() => {
    throw new Error('subscriber blew up');
  });
  subscribeToAuthChange(after);

  expect(() =>
    authStore.set(prev => ({ ...prev, isAuthenticated: true })),
  ).not.toThrow();

  expect(authStore.get().isAuthenticated).toBe(true);
  expect(after).toHaveBeenCalledWith(true);
});
