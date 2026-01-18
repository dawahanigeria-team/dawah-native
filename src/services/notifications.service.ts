/**
 * Notifications Service
 * Handles push notification registration and preferences
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from './api/notifications.api';
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
  enabled: false,
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
    lightColor: '#FF231F7C',
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

export const updatePushTokenAsync = async (expoPushToken: string): Promise<void> => {
  if (!expoPushToken) return;
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  await syncPushTokenAsync(expoPushToken);
};

export const getNotificationRouteFromData = (
  data: Record<string, unknown> | null | undefined,
): string | null => {
  if (!data) return null;

  const url = data.url;
  if (typeof url === 'string' && url.length > 0) {
    return url;
  }

  const lectureId = data.lectureId;
  if (typeof lectureId === 'string' && lectureId.length > 0) {
    return `/lecture/${lectureId}`;
  }

  const lecturerId = data.lecturerId;
  if (typeof lecturerId === 'string' && lecturerId.length > 0) {
    return `/lecturer/${lecturerId}`;
  }

  const playlistId = data.playlistId;
  if (typeof playlistId === 'string' && playlistId.length > 0) {
    return `/playlist/${playlistId}`;
  }

  return null;
};
