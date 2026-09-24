import AsyncStorage from "expo-sqlite/kv-store";
import { AppState, Platform } from "react-native";

type SecureStoreModule = {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY?: number;
  getItemAsync: (key: string, options?: unknown) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: unknown,
  ) => Promise<void>;
  deleteItemAsync: (key: string, options?: unknown) => Promise<void>;
};

let secureStoreModule: SecureStoreModule | null | undefined;
let hasLoggedFallback = false;

const logFallbackOnce = (error?: unknown): void => {
  if (hasLoggedFallback) return;
  hasLoggedFallback = true;
  console.warn(
    "SecureStore native module unavailable; falling back to AsyncStorage.",
    error,
  );
};

const loadSecureStoreModule = (): SecureStoreModule | null => {
  if (secureStoreModule !== undefined) {
    return secureStoreModule;
  }

  try {
    // Lazy-require to avoid hard crash when OTA JS runs on a binary
    // that does not include ExpoSecureStore.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStoreModule = require("expo-secure-store") as SecureStoreModule;
  } catch (error) {
    secureStoreModule = null;
    logFallbackOnce(error);
  }

  return secureStoreModule;
};

const shouldFallback = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    message.includes("ExpoSecureStore") ||
    message.includes("native module") ||
    message.includes("Keystore") ||
    message.includes("KeyGenParameterSpec") ||
    message.includes("cipher") ||
    message.includes("Could not decrypt")
  );
};

const isLockedKeychainError = (error: unknown): boolean =>
  Platform.OS === 'ios' && error instanceof Error &&
  /user interaction is not allowed/i.test(error.message);

const waitForForeground = (): Promise<void> => new Promise(resolve => {
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      subscription.remove();
      resolve();
    }
  });
  if (AppState.currentState === 'active') {
    subscription.remove();
    resolve();
  }
});

export const secureStoreCompat = {
  async getItemAsync(key: string, options?: unknown): Promise<string | null> {
    const module = loadSecureStoreModule();
    if (!module) {
      return AsyncStorage.getItem(key);
    }

    try {
      return await module.getItemAsync(key, options);
    } catch (error) {
      // Background audio can wake JS while protected keys are unavailable.
      // Keep the session intact and retry after unlock instead of treating the
      // credential as missing or copying it to unencrypted storage.
      if (isLockedKeychainError(error) && AppState.currentState !== 'active') {
        await waitForForeground();
        return module.getItemAsync(key, options);
      }
      if (shouldFallback(error)) {
        logFallbackOnce(error);
        return AsyncStorage.getItem(key);
      }
      throw error;
    }
  },

  async setItemAsync(
    key: string,
    value: string,
    options?: unknown,
  ): Promise<void> {
    const module = loadSecureStoreModule();
    if (!module) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    try {
      await module.setItemAsync(key, value, options ?? {
        // Audio and token refresh continue with the screen locked after the
        // first unlock. Credentials stay in the device-only Keychain.
        keychainAccessible: module.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      if (shouldFallback(error)) {
        logFallbackOnce(error);
        await AsyncStorage.setItem(key, value);
        return;
      }
      throw error;
    }
  },

  async deleteItemAsync(key: string, options?: unknown): Promise<void> {
    const module = loadSecureStoreModule();
    if (!module) {
      await AsyncStorage.removeItem(key);
      return;
    }

    try {
      await module.deleteItemAsync(key, options);
    } catch (error) {
      if (shouldFallback(error)) {
        logFallbackOnce(error);
        await AsyncStorage.removeItem(key);
        return;
      }
      throw error;
    }
  },
};
