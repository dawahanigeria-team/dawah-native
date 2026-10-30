import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useRecent } from './useRecent';
import { useQuranAlbums } from './useQuranAlbums';

jest.mock('../services/api/recent.api', () => ({
  recentApi: { getRecentLectures: jest.fn(() => new Promise(() => {})), clearPersistentCache: jest.fn() },
}));
jest.mock('../services/api/quran.api', () => ({
  quranApi: { getQuranAlbums: jest.fn(() => new Promise(() => {})) },
}));
jest.mock('../services/api/base.api', () => ({
  ApiError: class ApiError extends Error {},
}));
jest.mock('@/utils/logger', () => ({ logger: { debug: jest.fn() } }));

const seen: Record<string, boolean[]> = { recent: [], quran: [] };

function Probe({ kind, params }: { kind: 'recent' | 'quran'; params: any }) {
  const recent = useRecent(kind === 'recent' ? params : {});
  const quran = useQuranAlbums(kind === 'quran' ? params : undefined);
  seen[kind].push(kind === 'recent' ? recent.loading : quran.loading);
  return null;
}

let root: TestRenderer.ReactTestRenderer;
afterEach(() => {
  act(() => root.unmount());
  seen.recent = [];
  seen.quran = [];
});

test('useRecent reports loading on the first render while preferences are still hydrating', () => {
  act(() => {
    root = TestRenderer.create(<Probe kind="recent" params={{ limit: 6, enabled: false }} />);
  });
  expect(seen.recent[0]).toBe(true);
});

test('useRecent with no params never claims to be loading', () => {
  act(() => {
    root = TestRenderer.create(<Probe kind="recent" params={{}} />);
  });
  expect(seen.recent[0]).toBe(false);
});

test('useQuranAlbums reports loading on the first render', () => {
  act(() => {
    root = TestRenderer.create(<Probe kind="quran" params={{ limit: 6 }} />);
  });
  expect(seen.quran[0]).toBe(true);
});
