import AsyncStorage from "expo-sqlite/kv-store";

type SecureStoreModule = {
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
  return message.includes("ExpoSecureStore") || message.includes("native module");
};

export const secureStoreCompat = {
  async getItemAsync(key: string, options?: unknown): Promise<string | null> {
    const module = loadSecureStoreModule();
    if (!module) {
      return AsyncStorage.getItem(key);
    }

    try {
      return await module.getItemAsync(key, options);
    } catch (error) {
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
      await module.setItemAsync(key, value, options);
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
