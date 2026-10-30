// @ts-nocheck -- Node types are intentionally not part of the mobile runtime config.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../../app/(tabs)/index.tsx'), 'utf8');

test('the dead voice search button is gone until search supports it', () => {
  expect(source).not.toContain('voice=true');
  expect(source).not.toContain('name="mic"');
});

test('the header icon buttons are labelled buttons', () => {
  expect(source).toContain('accessibilityLabel="Edit listening preferences"');
  expect(source).toContain('"Notifications"');
  expect(source).toContain('`Notifications, ${unreadCount} unread`');
  expect(source.match(/accessibilityRole="button"/g).length).toBeGreaterThanOrEqual(3);
});
