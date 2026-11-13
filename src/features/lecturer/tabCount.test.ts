import { tabCount } from './tabCount';

test('shows the catalogue total, not the first page that has loaded', () => {
  // rplisting_multi_nid_api.php?id=5 on 2026-11-13: total_audio 545, total_albums 40.
  expect(tabCount(545, 10)).toBe(545);
  expect(tabCount(40, 10)).toBe(40);
});

test('falls back to what loaded when the total is missing or behind', () => {
  expect(tabCount(undefined, 10)).toBe(10);
  expect(tabCount(0, 3)).toBe(3);
});
