import fs from 'fs';
import path from 'path';
import { colorsDark, colorsLight } from './designTokens';

// The two palettes must actually disagree, otherwise every assertion below is
// vacuous and a theme bug would pass unnoticed.
test('the light and dark palettes differ where it matters', () => {
  expect(colorsLight.system.background.primary).not.toBe(
    colorsDark.system.background.primary,
  );
  expect(colorsLight.system.label.primary).not.toBe(
    colorsDark.system.label.primary,
  );
});

/**
 * `designTokens.colors` is the deprecated alias for `colorsDark`, so anything
 * reading it renders dark values in light mode. That is what made tab labels
 * and skeletons keep dark surfaces on a light background.
 *
 * Only the alias is a bug. An explicit `designTokens.colorsDark` /
 * `colorsLight` is a deliberate fixed accent — ActionGrid picks its tile icon
 * colours that way — so the lookahead excludes them.
 *
 * `fixed`, `palette` and `overlay` are exempt too: `fixed` is deliberately
 * theme-independent, and `palette`/`overlay` are byte-identical in both
 * palettes, so reading them statically cannot produce a theme bug.
 */
const DEPRECATED_ALIAS = /designTokens\.colors(?!Dark|Light)\./;
const EXEMPT = /colors\.(fixed|palette|overlay)\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

test('no component reads the deprecated static palette for themed colours', () => {
  const root = path.resolve(__dirname, '..', 'components');
  const offenders: string[] = [];

  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const [i, line] of src.split('\n').entries()) {
      if (!DEPRECATED_ALIAS.test(line)) continue;
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
      if (EXEMPT.test(line)) continue;
      offenders.push(`${path.relative(root, file)}:${i + 1}`);
    }
  }

  expect(offenders).toEqual([]);
});
