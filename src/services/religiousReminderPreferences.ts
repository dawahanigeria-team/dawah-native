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
  surahAlKahf: { enabled: true, time: '07:00' },
  mondayFast: { enabled: true, time: '20:00' },
  thursdayFast: { enabled: true, time: '20:00' },
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

  return {
    enabled: typeof candidate.enabled === 'boolean'
      ? candidate.enabled
      : defaultReligiousReminderPreferences.enabled,
    customized: candidate.customized === true,
    surahAlKahf: normalizeSetting(
      candidate.surahAlKahf,
      defaultReligiousReminderPreferences.surahAlKahf,
    ),
    mondayFast: normalizeSetting(
      candidate.mondayFast,
      defaultReligiousReminderPreferences.mondayFast,
    ),
    thursdayFast: normalizeSetting(
      candidate.thursdayFast,
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
