/**
 * Notifications Service
 * Handles push notification registration and preferences
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import { designTokens } from '../theme/designTokens';
import { registerPushToken } from './api/notifications.api';
import { linkingService } from './linking.service';
import { userService } from './user.service';

export type NotificationPrefs = {
  enabled: boolean;
  newLectures: boolean;
  favoritesActivity: boolean;
  downloadsComplete: boolean;
  announcements: boolean;
};

export const NOTIFICATION_PREFS_STORAGE_KEY = 'NOTIFICATION_PREFS';
export const EXPO_PUSH_TOKEN_STORAGE_KEY = 'EXPO_PUSH_TOKEN';

export const defaultNotificationPrefs: NotificationPrefs = {
  enabled: true, // Enabled by default so users get push token registered
  newLectures: false,
  favoritesActivity: false,
  downloadsComplete: false,
  announcements: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const getNotificationPrefs = async (): Promise<NotificationPrefs> => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!stored) return defaultNotificationPrefs;
    const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
    const merged = { ...defaultNotificationPrefs, ...parsed, announcements: true };
    if (parsed.announcements !== true) {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch (error) {
    console.warn('Failed to load notification preferences:', error);
    return defaultNotificationPrefs;
  }
};

export const setNotificationPrefs = async (prefs: NotificationPrefs): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to save notification preferences:', error);
  }
};

export const getStoredPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(EXPO_PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to load stored push token:', error);
    return null;
  }
};

const getProjectId = (): string | null => {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null
  );
};

export const ensureNotificationChannelsAsync = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  await Notifications.setNotificationChannelAsync('lectures', {
    name: 'New lectures',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: designTokens.colors.palette.notificationLight,
  });
};

const syncPushTokenAsync = async (
  expoPushToken: string,
  preferences?: NotificationPrefs,
): Promise<void> => {
  const userId = await userService.getUserId();
  await registerPushToken({
    userId,
    expoPushToken,
    platform: Platform.OS as 'ios' | 'android' | 'web',
    preferences: preferences ?? (await getNotificationPrefs()),
    device: {
      model: Device.modelName,
      os: Device.osName && Device.osVersion
        ? `${Device.osName} ${Device.osVersion}`
        : Device.osName ?? Device.osVersion ?? null,
    },
  });
};

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  await ensureNotificationChannelsAsync();

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) {
    return null;
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  let iosStatus = current.ios?.status;

  if (finalStatus !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
    iosStatus = request.ios?.status;
  }

  const isGranted =
    finalStatus === 'granted' ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!isGranted) {
    console.warn('Notification permissions not granted.');
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('Expo project ID not found for push notifications.');
    return null;
  }

  let expoPushToken: string;

  try {
    expoPushToken = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;
  } catch (error) {
    console.warn('Failed to get Expo push token:', error);
    return null;
  }

  // Validate token format before storing/syncing
  if (!isValidExpoPushToken(expoPushToken)) {
    console.warn('Invalid Expo push token format received:', expoPushToken);
    console.warn('Token will not be registered. This is a known Expo bug.');
    console.warn('Please try restarting the app or reinstalling.');
    return null;
  }

  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  await syncPushTokenAsync(expoPushToken, prefs);

  return expoPushToken;
};

export const syncNotificationPreferencesAsync = async (
  prefs: NotificationPrefs,
): Promise<void> => {
  const storedToken = await getStoredPushToken();
  if (!storedToken) {
    if (prefs.enabled) {
      await registerForPushNotificationsAsync();
    }
    return;
  }

  await syncPushTokenAsync(storedToken, prefs);
};

export const disablePushNotificationsAsync = async (): Promise<void> => {
  try {
    await Notifications.unregisterForNotificationsAsync();
  } catch (error) {
    console.warn('Failed to unregister for notifications:', error);
  }

  try {
    await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear push token:', error);
  }
};

/**
 * Validate Expo push token format
 * Valid format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 */
const isValidExpoPushToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;

  // Valid Expo push tokens start with "ExponentPushToken[" or "ExpoPushToken["
  // and end with "]"
  const validPattern = /^Expo(nent)?PushToken\[.+\]$/;
  return validPattern.test(token);
};

export const updatePushTokenAsync = async (expoPushToken: string): Promise<void> => {
  if (!expoPushToken) return;

  // Validate token format before storing/syncing
  if (!isValidExpoPushToken(expoPushToken)) {
    console.warn('Invalid Expo push token format received:', expoPushToken);
    console.warn('Token will not be registered. This is a known Expo bug: https://github.com/expo/expo/issues/22903');
    return;
  }

  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  await syncPushTokenAsync(expoPushToken);
};

const VALID_ROUTE_SEGMENT = /^[A-Za-z0-9_-]{1,120}$/;
const VALID_NOTIFICATION_ROUTE = /^\/(lecture|lecturer|playlist)\/[A-Za-z0-9_-]{1,120}$/;

const normalizeRouteSegment = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return VALID_ROUTE_SEGMENT.test(trimmed) ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeNotificationRoute = (rawRoute: string): string | null => {
  const trimmedRoute = rawRoute.trim();
  if (!trimmedRoute) return null;

  let candidatePath: string | null = null;
  const isFullDeepLink =
    trimmedRoute.startsWith('https://') ||
    trimmedRoute.startsWith('dawahnigeria://');

  if (isFullDeepLink) {
    const parsed = linkingService.parseURL(trimmedRoute);
    candidatePath = parsed?.path ?? null;
  } else {
    candidatePath = trimmedRoute;
  }

  if (!candidatePath) return null;

  const withoutQuery = candidatePath.split(/[?#]/)[0] || '';
  const normalized = `/${withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '')}`;

  if (!VALID_NOTIFICATION_ROUTE.test(normalized)) {
    return null;
  }

  return normalized;
};

export const getNotificationRouteFromData = (
  data: Record<string, unknown> | null | undefined,
): string | null => {
  if (!data) return null;

  const url = data.url;
  if (typeof url === 'string' && url.length > 0) {
    const normalizedRoute = normalizeNotificationRoute(url);
    if (normalizedRoute) return normalizedRoute;
  }

  const lectureId = normalizeRouteSegment(data.lectureId);
  if (lectureId) {
    return `/lecture/${lectureId}`;
  }

  const lecturerId = normalizeRouteSegment(data.lecturerId);
  if (lecturerId) {
    return `/lecturer/${lecturerId}`;
  }

  const playlistId = normalizeRouteSegment(data.playlistId);
  if (playlistId) {
    return `/playlist/${playlistId}`;
  }

  return null;
};
