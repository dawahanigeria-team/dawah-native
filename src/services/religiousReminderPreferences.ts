export type ReminderType = 'surahAlKahf' | 'mondayFast' | 'thursdayFast'

export type ReminderSetting = {
  enabled: boolean
  time: string
}

export type ReligiousReminderPreferences = {
  enabled: boolean
  customized: boolean
  surahAlKahf: ReminderSetting
  mondayFast: ReminderSetting
  thursdayFast: ReminderSetting
}

export const defaultReligiousReminderPreferences: ReligiousReminderPreferences = {
  enabled: true,
  customized: false,
  surahAlKahf: { enabled: true, time: '06:30' },
  mondayFast: { enabled: true, time: '20:30' },
  thursdayFast: { enabled: true, time: '20:30' },
}

const VALID_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export const isValidReminderTime = (value: unknown): value is string =>
  typeof value === 'string' && VALID_TIME.test(value)

const normalizeSetting = (
  value: unknown,
  fallback: ReminderSetting,
): ReminderSetting => {
  const candidate = value && typeof value === 'object'
    ? value as Partial<ReminderSetting>
    : {}

  return {
    enabled: typeof candidate.enabled === 'boolean'
      ? candidate.enabled
      : fallback.enabled,
    time: isValidReminderTime(candidate.time) ? candidate.time : fallback.time,
  }
}

export const normalizeReligiousReminderPreferences = (
  value: unknown,
): ReligiousReminderPreferences => {
  const candidate = value && typeof value === 'object'
    ? value as Partial<ReligiousReminderPreferences>
    : {}
  const customized = candidate.customized === true

  const settingValue = (setting: ReminderSetting | undefined): unknown =>
    customized ? setting : { enabled: setting?.enabled }

  return {
    enabled: typeof candidate.enabled === 'boolean'
      ? candidate.enabled
      : defaultReligiousReminderPreferences.enabled,
    customized,
    surahAlKahf: normalizeSetting(
      settingValue(candidate.surahAlKahf),
      defaultReligiousReminderPreferences.surahAlKahf,
    ),
    mondayFast: normalizeSetting(
      settingValue(candidate.mondayFast),
      defaultReligiousReminderPreferences.mondayFast,
    ),
    thursdayFast: normalizeSetting(
      settingValue(candidate.thursdayFast),
      defaultReligiousReminderPreferences.thursdayFast,
    ),
  }
}

export const updateReligiousReminder = (
  current: ReligiousReminderPreferences,
  type: ReminderType,
  patch: Partial<ReminderSetting>,
): ReligiousReminderPreferences => {
  const nextTime = patch.time === undefined || isValidReminderTime(patch.time)
    ? patch.time
    : current[type].time

  return {
    ...current,
    customized: true,
    [type]: {
      ...current[type],
      ...patch,
      ...(nextTime === undefined ? {} : { time: nextTime }),
    },
  }
}
