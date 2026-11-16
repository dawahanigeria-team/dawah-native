import { redirectSystemPath } from './systemPath';

const redirect = (path: string) => redirectSystemPath({ path, initial: true });

test('a shared lecture link opens the lecture screen', () => {
  expect(redirect('https://dawahnigeria.com/dawahcast/l/139638')).toBe('/lecture/139638');
  expect(redirect('dawahnigeria://dawahcast/l/139638')).toBe('/lecture/139638');
  expect(redirect('/dawahcast/l/139638')).toBe('/lecture/139638');
});

test('album, playlist and scholar links map to their screens', () => {
  expect(redirect('https://dawahnigeria.com/dawahcast/a/42')).toBe('/album/42');
  expect(redirect('https://dawahnigeria.com/dawahcast/pl/7')).toBe('/playlist/7');
  expect(redirect('https://dawahnigeria.com/dawahcast/p/7')).toBe('/playlist/7');
  expect(redirect('https://www.dawahnigeria.com/dawahcast/rp/9')).toBe('/lecturer/9');
});

test('query strings and trailing slashes do not break the match', () => {
  expect(redirect('https://dawahnigeria.com/dawahcast/l/139638/?utm_source=whatsapp')).toBe('/lecture/139638');
});

test('a website link the app has no screen for lands on Home, not Unmatched Route', () => {
  expect(redirect('https://dawahnigeria.com/dawahcast/l/not%20an%20id')).toBe('/');
  expect(redirect('https://dawahnigeria.com/dawahcast/unknown/1')).toBe('/');
});

test('links that are not website links pass through untouched', () => {
  expect(redirect('dawahnigeria://lecture/5')).toBe('dawahnigeria://lecture/5');
  expect(redirect('dawahnigeria://notification.click')).toBe('dawahnigeria://notification.click');
  expect(redirect('https://evil.example/dawahcast/l/1')).toBe('https://evil.example/dawahcast/l/1');
});
