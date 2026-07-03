import AsyncStorage from 'expo-sqlite/kv-store'
import * as Notifications from 'expo-notifications'
import { getCalendars } from 'expo-localization'
import { registerPushToken } from './api/notifications.api'
import {
  disablePushNotificationsAsync,
  getNotificationPrefs,
  getNotificationRouteFromData,
  syncNotificationPreferencesAsync,
  type NotificationPrefs,
} from './notifications.service'
import { defaultReligiousReminderPreferences } from './religiousReminderPreferences'

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'project-id' } } },
  easConfig: { projectId: 'project-id' },
}))

jest.mock('expo-device', () => ({
  isDevice: true,
  modelName: 'Pixel',
  osName: 'Android',
  osVersion: '16',
}))

jest.mock('expo-localization', () => ({
  getCalendars: jest.fn(),
}))

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  unregisterForNotificationsAsync: jest.fn(),
}))

jest.mock('expo-sqlite/kv-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

jest.mock('./api/notifications.api', () => ({
  registerPushToken: jest.fn(),
}))

jest.mock('./user.service', () => ({
  userService: { getUserId: jest.fn().mockResolvedValue('user-1') },
}))

jest.mock('./linking.service', () => ({
  linkingService: { parseURL: jest.fn() },
}))

const mockGetItem = AsyncStorage.getItem as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock
const mockRegisterPushToken = registerPushToken as jest.Mock
const mockGetCalendars = getCalendars as jest.Mock

const basePrefs = (): NotificationPrefs => ({
  enabled: true,
  newLectures: false,
  favoritesActivity: false,
  downloadsComplete: false,
  announcements: true,
  religiousReminders: defaultReligiousReminderPreferences,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCalendars.mockReturnValue([{ timeZone: 'Asia/Kolkata' }])
  mockRegisterPushToken.mockResolvedValue({ data: { success: true } })
})

test('migrates legacy stored notification preferences', async () => {
  mockGetItem.mockResolvedValue(JSON.stringify({ enabled: true, announcements: true }))

  await expect(getNotificationPrefs()).resolves.toMatchObject({
    religiousReminders: defaultReligiousReminderPreferences,
  })
  expect(mockSetItem).toHaveBeenCalledWith(
    'NOTIFICATION_PREFS',
    expect.stringContaining('religiousReminders'),
  )
})

test('rewrites malformed stored reminder settings with normalized values', async () => {
  mockGetItem.mockResolvedValue(JSON.stringify({
    ...basePrefs(),
    religiousReminders: {
      ...defaultReligiousReminderPreferences,
      surahAlKahf: { enabled: true, time: '7:00' },
    },
  }))

  const preferences = await getNotificationPrefs()

  expect(preferences.religiousReminders.surahAlKahf.time).toBe('07:00')
  expect(mockSetItem).toHaveBeenCalledWith(
    'NOTIFICATION_PREFS',
    expect.stringContaining('"time":"07:00"'),
  )
})

test('syncs customized reminders in the device timezone without local metadata', async () => {
  mockGetItem.mockResolvedValue('ExponentPushToken[token]')
  const prefs = basePrefs()
  prefs.religiousReminders = {
    ...defaultReligiousReminderPreferences,
    customized: true,
    surahAlKahf: { enabled: true, time: '08:30' },
  }

  await syncNotificationPreferencesAsync(prefs)

  expect(mockRegisterPushToken).toHaveBeenCalledWith(expect.objectContaining({
    timezone: 'Asia/Kolkata',
    religiousReminders: {
      enabled: true,
      surahAlKahf: { enabled: true, time: '08:30' },
      mondayFast: { enabled: true, time: '20:00' },
      thursdayFast: { enabled: true, time: '20:00' },
    },
  }))
})

test('keeps uncustomized reminders on WAT', async () => {
  mockGetItem.mockResolvedValue('ExponentPushToken[token]')

  await syncNotificationPreferencesAsync(basePrefs())

  expect(mockRegisterPushToken).toHaveBeenCalledWith(expect.objectContaining({
    timezone: 'Africa/Lagos',
  }))
})

test('syncs global opt-out before unregistering and deleting the token', async () => {
  mockGetItem.mockResolvedValue('ExponentPushToken[token]')
  const prefs = { ...basePrefs(), enabled: false }

  await disablePushNotificationsAsync(prefs)

  expect(mockRegisterPushToken).toHaveBeenCalledWith(expect.objectContaining({
    preferences: expect.objectContaining({ enabled: false }),
  }))
  expect(Notifications.unregisterForNotificationsAsync).toHaveBeenCalledTimes(1)
  expect(mockRemoveItem).toHaveBeenCalledWith('EXPO_PUSH_TOKEN')
  expect(mockRegisterPushToken.mock.invocationCallOrder[0]).toBeLessThan(
    (Notifications.unregisterForNotificationsAsync as jest.Mock).mock.invocationCallOrder[0],
  )
})

test('routes trusted religious reminder types without accepting push-supplied queries', () => {
  expect(getNotificationRouteFromData({ type: 'surah_al_kahf_reminder' }))
    .toBe('/search?q=Al-Kahf')
  expect(getNotificationRouteFromData({ type: 'monday_fast_reminder' })).toBe('/')
  expect(getNotificationRouteFromData({ type: 'thursday_fast_reminder' })).toBe('/')
  expect(getNotificationRouteFromData({
    type: 'surah_al_kahf_reminder',
    q: 'javascript:bad',
    url: '/lecture/999',
  })).toBe('/search?q=Al-Kahf')
})
