import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from 'expo-sqlite/kv-store';
import { secureStoreCompat } from './secureStoreCompat';
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock('expo-sqlite/kv-store', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
afterEach(() => jest.restoreAllMocks());
test('locked background reads wait for foreground without losing credentials', async () => {
  const previousState = AppState.currentState;
  const previousOS = Platform.OS;
  Platform.OS = 'ios';
  AppState.currentState = 'background';
  let listener!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
    listener = callback;
    return { remove };
  });
  (SecureStore.getItemAsync as jest.Mock)
    .mockRejectedValueOnce(new Error('User interaction is not allowed.'))
    .mockResolvedValueOnce('existing-token');
  try {
    const read = secureStoreCompat.getItemAsync('access_token');
    await Promise.resolve();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    listener('active');
    await expect(read).resolves.toBe('existing-token');
    expect(remove).toHaveBeenCalled();
  } finally {
    AppState.currentState = previousState;
    Platform.OS = previousOS;
  }
});
test('new tokens support locked-screen audio while remaining device-only', async () => {
  await secureStoreCompat.setItemAsync('access_token', 'token');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'token', {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
});
