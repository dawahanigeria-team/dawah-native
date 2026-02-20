import AsyncStorage from 'expo-sqlite/kv-store';
import { LecturerFollowType } from './api/lecturerFollow.api';

const FOLLOW_CACHE_KEY = 'lecturer_follow_state_v1';

type FollowCache = Record<string, true>;

interface LecturerFollowCacheInput {
  userId: string | number;
  lecturerId: string | number;
  type: LecturerFollowType;
}

interface SetLecturerFollowCacheInput extends LecturerFollowCacheInput {
  following: boolean;
}

const normalizeId = (value: string | number): string => String(value ?? '').trim();

const toCacheEntryKey = ({
  userId,
  lecturerId,
  type,
}: LecturerFollowCacheInput): string => {
  return `${normalizeId(userId)}:${type}:${normalizeId(lecturerId)}`;
};

const sanitizeCache = (value: unknown): FollowCache => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, state]) => key.trim().length > 0 && state === true,
  );

  return Object.fromEntries(entries) as FollowCache;
};

const readFollowCache = async (): Promise<FollowCache> => {
  try {
    const raw = await AsyncStorage.getItem(FOLLOW_CACHE_KEY);
    if (!raw) return {};
    return sanitizeCache(JSON.parse(raw));
  } catch {
    return {};
  }
};

const writeFollowCache = async (cache: FollowCache): Promise<void> => {
  await AsyncStorage.setItem(FOLLOW_CACHE_KEY, JSON.stringify(cache));
};

export const getCachedLecturerFollowState = async ({
  userId,
  lecturerId,
  type,
}: LecturerFollowCacheInput): Promise<boolean> => {
  if (!normalizeId(userId) || !normalizeId(lecturerId)) {
    return false;
  }

  const cache = await readFollowCache();
  const key = toCacheEntryKey({ userId, lecturerId, type });
  return cache[key] === true;
};

export const setCachedLecturerFollowState = async ({
  userId,
  lecturerId,
  type,
  following,
}: SetLecturerFollowCacheInput): Promise<void> => {
  if (!normalizeId(userId) || !normalizeId(lecturerId)) {
    return;
  }

  const cache = await readFollowCache();
  const key = toCacheEntryKey({ userId, lecturerId, type });

  if (following) {
    cache[key] = true;
  } else {
    delete cache[key];
  }

  await writeFollowCache(cache);
};
