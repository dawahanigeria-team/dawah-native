// @ts-nocheck -- Node types are intentionally not part of the mobile runtime config.
import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(
  path.join(__dirname, 'ReminderTimePickerModal.tsx'),
  'utf8',
)

test('exposes a controlled time-picker contract', () => {
  expect(source).toContain('visible: boolean')
  expect(source).toContain('value: string')
  expect(source).toContain('onConfirm: (value: string) => void')
  expect(source).toContain('onCancel: () => void')
})

test('provides all hours and five-minute choices', () => {
  expect(source).toContain('Array.from({ length: 24 }')
  expect(source).toContain('Array.from({ length: 12 }')
  expect(source).toContain("String(index * 5).padStart(2, '0')")
})

test('includes accessible confirm and cancel actions', () => {
  expect(source).toContain('accessibilityLabel="Cancel reminder time"')
  expect(source).toContain('accessibilityLabel="Confirm reminder time"')
  expect(source).toContain('accessibilityRole="adjustable"')
})
