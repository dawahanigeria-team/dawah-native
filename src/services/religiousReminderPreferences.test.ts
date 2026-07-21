import {
  defaultReligiousReminderPreferences,
  normalizeReligiousReminderPreferences,
  updateReligiousReminder,
} from './religiousReminderPreferences'

test('migrates legacy preferences to enabled WAT schedule defaults', () => {
  expect(normalizeReligiousReminderPreferences(undefined)).toEqual(
    defaultReligiousReminderPreferences,
  )
})

test('normalizes each malformed reminder time independently', () => {
  expect(
    normalizeReligiousReminderPreferences({
      enabled: false,
      customized: true,
      surahAlKahf: { enabled: false, time: '9:30' },
      mondayFast: { enabled: true, time: '21:15' },
      thursdayFast: { enabled: false, time: '26:00' },
    }),
  ).toEqual({
    enabled: false,
    customized: true,
    surahAlKahf: { enabled: false, time: '06:30' },
    mondayFast: { enabled: true, time: '21:15' },
    thursdayFast: { enabled: false, time: '20:30' },
  })
})

test('updates one reminder immutably and marks preferences customized', () => {
  const current = defaultReligiousReminderPreferences
  const updated = updateReligiousReminder(current, 'surahAlKahf', {
    time: '08:30',
  })

  expect(updated).not.toBe(current)
  expect(updated.surahAlKahf).toEqual({ enabled: true, time: '08:30' })
  expect(updated.mondayFast).toBe(current.mondayFast)
  expect(updated.customized).toBe(true)
  expect(current.surahAlKahf.time).toBe('06:30')
})

test('rejects malformed updates by preserving the current valid time', () => {
  const updated = updateReligiousReminder(
    defaultReligiousReminderPreferences,
    'mondayFast',
    { time: '99:00' },
  )

  expect(updated.mondayFast.time).toBe('20:30')
})

test('migrates previous uncustomized times to the new WAT defaults', () => {
  expect(normalizeReligiousReminderPreferences({
    customized: false,
    surahAlKahf: { enabled: true, time: '07:00' },
    mondayFast: { enabled: false, time: '20:00' },
    thursdayFast: { enabled: true, time: '20:00' },
  })).toEqual({
    enabled: true,
    customized: false,
    surahAlKahf: { enabled: true, time: '06:30' },
    mondayFast: { enabled: false, time: '20:30' },
    thursdayFast: { enabled: true, time: '20:30' },
  })
})
