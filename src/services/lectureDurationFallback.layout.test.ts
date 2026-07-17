// @ts-nocheck -- Node types are intentionally not part of the mobile runtime config.
import fs from 'fs';
import path from 'path';

const lectureSource = fs.readFileSync(
  path.join(__dirname, '../../app/lecture/[id].tsx'),
  'utf8',
);
const audioProviderSource = fs.readFileSync(
  path.join(__dirname, '../components/providers/AudioProvider.tsx'),
  'utf8',
);

test('lecture controls prefer the duration measured by the native player', () => {
  expect(lectureSource).toContain('duration: measuredDuration');
  expect(lectureSource).toContain('isCurrentLecture && measuredDuration > 0');
});

test('measured duration repairs active episode and queue metadata', () => {
  expect(audioProviderSource).toContain('durationSec: status.duration');
  expect(audioProviderSource).toContain('updates.queue = currentState.queue.map');
  expect(audioProviderSource).toContain('updates.originalQueue = currentState.originalQueue.map');
});
