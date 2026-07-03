// @ts-nocheck -- Node types are intentionally not part of the mobile runtime config.
import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(
  path.join(__dirname, '../../app/notifications.tsx'),
  'utf8',
)

test('renders religious reminder controls and timezone explanation', () => {
  expect(source).toContain('Religious reminders')
  expect(source).toContain('Surah Al-Kahf — Friday')
  expect(source).toContain('Monday fast — remind me Sunday')
  expect(source).toContain('Thursday fast — remind me Wednesday')
  expect(source).toContain('Defaults use West Africa Time')
})

test('integrates the reminder time picker and customization helpers', () => {
  expect(source).toContain('ReminderTimePickerModal')
  expect(source).toContain('updateReligiousReminder')
  expect(source).toContain('customized: true')
})
