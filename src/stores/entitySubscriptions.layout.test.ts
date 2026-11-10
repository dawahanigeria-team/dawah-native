// @ts-nocheck -- Node types are intentionally not part of the mobile runtime config.
import fs from 'fs';
import path from 'path';

const repo = path.resolve(__dirname, '..', '..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
};

// React Compiler does not read `store.use()` as a hook, so it caches the first
// value and the component re-renders with stale data. That froze the player's
// clock. `useEntity` is the same subscription under a name the compiler knows.
test('stores are read through useEntity, not store.use()', () => {
  const offenders = ['app', 'src']
    .flatMap((root) => walk(path.join(repo, root)))
    .filter((file) => /\b\w+Store\.use\(/.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(repo, file));

  expect(offenders).toEqual([]);
});
