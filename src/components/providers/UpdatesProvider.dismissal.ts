import AsyncStorage from 'expo-sqlite/kv-store';

const DISMISSED_UPDATE_ID_STORAGE_KEY = 'updates:dismissed-ota-update-id';

type UpdateManifestLike = {
  id?: unknown;
} | null | undefined;

export const getUpdateIdFromManifest = (manifest: UpdateManifestLike): string | null => {
  const id = manifest?.id;
  if (typeof id !== 'string') return null;
  const normalizedId = id.trim();
  return normalizedId.length > 0 ? normalizedId : null;
};

export const isDismissedUpdate = (
  availableUpdateId: string | null,
  dismissedUpdateId: string | null
): boolean => availableUpdateId !== null && availableUpdateId === dismissedUpdateId;

export const getDismissedUpdateId = async (): Promise<string | null> => {
  const value = await AsyncStorage.getItem(DISMISSED_UPDATE_ID_STORAGE_KEY);
  if (typeof value !== 'string') return null;
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

export const setDismissedUpdateId = async (updateId: string): Promise<void> => {
  const normalizedId = updateId.trim();
  if (!normalizedId) return;
  await AsyncStorage.setItem(DISMISSED_UPDATE_ID_STORAGE_KEY, normalizedId);
};
