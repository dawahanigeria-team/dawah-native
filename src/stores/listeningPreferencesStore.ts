import AsyncStorage from "expo-sqlite/kv-store";
import { entity, useEntity } from "simpler-state";

import { listeningPreferencesApi } from "../services/api/listeningPreferences.api";
import {
  EMPTY_LISTENING_PREFERENCES,
  hasListeningPreferences,
  normalizePreferenceIds,
  type ListeningPreferences,
} from "../types/listeningPreferences.types";

const PREFERENCES_KEY = "listening_preferences_v1";
export const PREFERENCES_ONBOARDING_KEY = "listening_preferences_onboarding_complete_v1";

interface ListeningPreferencesState {
  preferences: ListeningPreferences;
  isHydrated: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: ListeningPreferencesState = {
  preferences: EMPTY_LISTENING_PREFERENCES,
  isHydrated: false,
  isSaving: false,
  error: null,
};

export const listeningPreferencesStore = entity(initialState);

let initializationPromise: Promise<void> | null = null;
let lastRemoteSync = false;

const persist = async (preferences: ListeningPreferences): Promise<void> => {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
};

const readLocal = async (): Promise<ListeningPreferences> => {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return EMPTY_LISTENING_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ListeningPreferences>;
    const languageIds = normalizePreferenceIds(parsed.languageIds ?? []);
    const lecturerIds = normalizePreferenceIds(parsed.lecturerIds ?? []);
    return {
      languageIds,
      lecturerIds,
      configured: Boolean(parsed.configured || languageIds.length || lecturerIds.length),
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return EMPTY_LISTENING_PREFERENCES;
  }
};

export const initializeListeningPreferences = async (
  syncRemote = false,
  force = false,
): Promise<void> => {
  const current = listeningPreferencesStore.get();
  if (!force && current.isHydrated && (!syncRemote || lastRemoteSync)) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    const local = await readLocal();
    listeningPreferencesStore.set((previous) => ({
      ...previous,
      preferences: local,
      isHydrated: true,
      error: null,
    }));

    if (!syncRemote) return;

    try {
      const remote = await listeningPreferencesApi.get();
      if (remote.configured && hasListeningPreferences(remote)) {
        await persist(remote);
        listeningPreferencesStore.set((previous) => ({
          ...previous,
          preferences: remote,
        }));
      } else if (local.configured && hasListeningPreferences(local)) {
        const saved = await listeningPreferencesApi.update(local);
        await persist(saved);
        listeningPreferencesStore.set((previous) => ({
          ...previous,
          preferences: saved,
        }));
      }
      lastRemoteSync = true;
    } catch (error) {
      // Local preferences remain fully usable offline. Surface the sync issue
      // only on the editor; Home should not become an error screen.
      listeningPreferencesStore.set((previous) => ({
        ...previous,
        error: error instanceof Error ? error.message : "Could not sync preferences",
      }));
    }
  })().finally(() => {
    initializationPromise = null;
  });

  return initializationPromise;
};

export const saveListeningPreferences = async (
  values: Pick<ListeningPreferences, "languageIds" | "lecturerIds">,
  syncRemote: boolean,
): Promise<ListeningPreferences> => {
  const normalized: ListeningPreferences = {
    languageIds: normalizePreferenceIds(values.languageIds),
    lecturerIds: normalizePreferenceIds(values.lecturerIds),
    configured: true,
    updatedAt: new Date().toISOString(),
  };

  if (!hasListeningPreferences(normalized)) {
    throw new Error("Choose at least one language or scholar");
  }

  listeningPreferencesStore.set((previous) => ({
    ...previous,
    preferences: normalized,
    isHydrated: true,
    isSaving: true,
    error: null,
  }));
  await persist(normalized);

  try {
    const saved = syncRemote
      ? await listeningPreferencesApi.update(normalized)
      : normalized;
    await persist(saved);
    lastRemoteSync = syncRemote;
    listeningPreferencesStore.set((previous) => ({
      ...previous,
      preferences: saved,
      isSaving: false,
    }));
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save preferences";
    listeningPreferencesStore.set((previous) => ({
      ...previous,
      isSaving: false,
      error: message,
    }));
    // The local save intentionally survives a sync failure so users on an
    // unstable connection still get their chosen feed immediately.
    throw error;
  }
};

export const markPreferenceOnboardingComplete = async (): Promise<void> => {
  await AsyncStorage.setItem(PREFERENCES_ONBOARDING_KEY, "true");
};

export const hasCompletedPreferenceOnboarding = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(PREFERENCES_ONBOARDING_KEY)) === "true";

export const resetListeningPreferencesSession = (): void => {
  lastRemoteSync = false;
  listeningPreferencesStore.set(initialState);
};

export const clearListeningPreferencesForSignedOutSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(PREFERENCES_KEY);
  lastRemoteSync = false;
  listeningPreferencesStore.set({
    ...initialState,
    isHydrated: true,
  });
};

export const useListeningPreferencesStore = () => useEntity(listeningPreferencesStore);
