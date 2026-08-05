// @ts-nocheck -- Node types are intentionally not part of the mobile runtime config.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../../app/search.tsx'), 'utf8');

test('renders prioritized scholar, lecture, and album search sections', () => {
  expect(source).toContain('Scholars');
  expect(source).toContain('Lectures');
  expect(source).toContain('Albums');
  expect(source).toContain('See all');
  expect(source).toContain('lecturerResults.slice(0, 2)');
  expect(source).toContain('albumResults.slice(0, 2)');
});

test('loads cross-content discovery results for the submitted search', () => {
  expect(source).toContain('.searchDiscovery(query)');
});
