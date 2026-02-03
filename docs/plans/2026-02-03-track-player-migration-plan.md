# Track Player Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `expo-audio` with `react-native-track-player`, make Track Player the source of truth for queue/state, and restore queue + position on launch.

**Architecture:** Track Player owns playback and queue state; `playerStore` mirrors Track Player for UI. A minimal queue snapshot persists to AsyncStorage and restores on app start.

**Tech Stack:** Expo SDK 54, React Native 0.81, react-native-track-player, expo-sqlite/kv-store (AsyncStorage), simpler-state, Jest

---

### Task 0: Confirm TDD exception for config-only changes

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `AppEntry.js`

**Step 1: Ask for exception**
Ask the user to allow a TDD exception for configuration/entrypoint wiring (no practical unit tests).

**Step 2: Run minimal smoke check (post-change)**
Run: `pnpm lint`
Expected: Lint passes (warnings ok).

**Step 3: Commit**
```bash
git add package.json app.json AppEntry.js
 git commit -m "chore: wire track player entry and config"
```

---

### Task 1: Add Track Player dependency and remove expo-audio

**Files:**
- Modify: `package.json`
- Modify: `app.json`

**Step 1: Write a failing test**
Skip (config-only; covered by Task 0 exception).

**Step 2: Install dependency**
Run: `npx expo install react-native-track-player`

**Step 3: Remove expo-audio**
- Remove `expo-audio` from `package.json`.
- Remove `expo-audio` plugin from `app.json`.

**Step 4: Run lint**
Run: `pnpm lint`
Expected: Lint passes.

**Step 5: Commit**
```bash
git add package.json app.json
 git commit -m "chore: add track player and drop expo-audio"
```

---

### Task 2: Create queue snapshot service (TDD)

**Files:**
- Create: `src/services/playerQueue.service.ts`
- Create: `src/services/playerQueue.service.test.ts`

**Step 1: Write the failing test**
```ts
// src/services/playerQueue.service.test.ts
import AsyncStorage from 'expo-sqlite/kv-store'
import { loadQueueSnapshot, saveQueueSnapshot, clearQueueSnapshot } from './playerQueue.service'

jest.mock('expo-sqlite/kv-store', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}))

test('saves and loads a minimal queue snapshot', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
    trackIds: ['1','2'],
    currentIndex: 1,
    position: 120,
    playbackRate: 1.25,
    repeatMode: 'all',
    isShuffled: true,
    currentTrack: { id: '2', title: 'T', artist: 'A', artwork: 'url' },
  }))

  await saveQueueSnapshot({
    trackIds: ['1','2'],
    currentIndex: 1,
    position: 120,
    playbackRate: 1.25,
    repeatMode: 'all',
    isShuffled: true,
    currentTrack: { id: '2', title: 'T', artist: 'A', artwork: 'url' },
  })

  const snapshot = await loadQueueSnapshot()
  expect(snapshot?.trackIds).toEqual(['1','2'])
  expect(snapshot?.currentIndex).toBe(1)
})

test('clears snapshot', async () => {
  await clearQueueSnapshot()
  expect(AsyncStorage.removeItem).toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**
Run: `pnpm test src/services/playerQueue.service.test.ts`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**
```ts
// src/services/playerQueue.service.ts
import AsyncStorage from 'expo-sqlite/kv-store'

const QUEUE_SNAPSHOT_KEY = 'PLAYER_QUEUE_SNAPSHOT'

export type QueueSnapshot = {
  trackIds: string[]
  currentIndex: number
  position: number
  playbackRate: number
  repeatMode: 'off' | 'one' | 'all'
  isShuffled: boolean
  currentTrack?: { id: string; title: string; artist?: string; artwork?: string }
}

export const saveQueueSnapshot = async (snapshot: QueueSnapshot) => {
  await AsyncStorage.setItem(QUEUE_SNAPSHOT_KEY, JSON.stringify(snapshot))
}

export const loadQueueSnapshot = async (): Promise<QueueSnapshot | null> => {
  const raw = await AsyncStorage.getItem(QUEUE_SNAPSHOT_KEY)
  return raw ? (JSON.parse(raw) as QueueSnapshot) : null
}

export const clearQueueSnapshot = async () => {
  await AsyncStorage.removeItem(QUEUE_SNAPSHOT_KEY)
}
```

**Step 4: Run test to verify it passes**
Run: `pnpm test src/services/playerQueue.service.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/services/playerQueue.service.ts src/services/playerQueue.service.test.ts
 git commit -m "feat: add queue snapshot persistence"
```

---

### Task 3: Track conversion helpers (TDD)

**Files:**
- Create: `src/services/trackPlayerQueue.service.ts`
- Create: `src/services/trackPlayerQueue.service.test.ts`

**Step 1: Write the failing test**
```ts
// src/services/trackPlayerQueue.service.test.ts
import { buildTrack, buildQueue } from './trackPlayerQueue.service'

const episode = {
  id: '10',
  title: 'Lecture',
  lecturerName: 'Ustadh',
  coverUrl: 'img',
  audioUrl: 'https://example.com/audio.mp3',
  durationSec: 3600,
}

test('buildTrack maps Episode to Track Player track', () => {
  const track = buildTrack(episode, 'file:///local.mp3')
  expect(track.id).toBe('10')
  expect(track.title).toBe('Lecture')
  expect(track.artist).toBe('Ustadh')
  expect(track.url).toBe('file:///local.mp3')
})

test('buildQueue preserves order', () => {
  const queue = buildQueue([episode, { ...episode, id: '11', title: 'Next' }], (e) => e.audioUrl)
  expect(queue.map((t) => t.id)).toEqual(['10', '11'])
})
```

**Step 2: Run test to verify it fails**
Run: `pnpm test src/services/trackPlayerQueue.service.test.ts`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**
```ts
// src/services/trackPlayerQueue.service.ts
import type { Episode } from '../types/types'

export type TrackPlayerTrack = {
  id: string
  url: string
  title: string
  artist?: string
  artwork?: string
  duration?: number
}

export const buildTrack = (episode: Episode, url: string): TrackPlayerTrack => ({
  id: String(episode.id),
  url,
  title: episode.title,
  artist: episode.lecturerName,
  artwork: episode.coverUrl,
  duration: episode.durationSec,
})

export const buildQueue = (
  episodes: Episode[],
  resolveUrl: (episode: Episode) => string
): TrackPlayerTrack[] => episodes.map((episode) => buildTrack(episode, resolveUrl(episode)))
```

**Step 4: Run test to verify it passes**
Run: `pnpm test src/services/trackPlayerQueue.service.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/services/trackPlayerQueue.service.ts src/services/trackPlayerQueue.service.test.ts
 git commit -m "feat: add track queue builders"
```

---

### Task 4: Track Player service + custom entry

**Files:**
- Create: `src/services/trackPlayer.service.ts`
- Create: `AppEntry.js`
- Modify: `package.json`

**Step 1: Write failing test**
Skip (config-only; covered by Task 0 exception).

**Step 2: Add playback service**
Implement handlers for remote events: Play, Pause, Next, Previous, Seek.

**Step 3: Add custom entry**
Register playback service, then import `expo-router/entry`.

**Step 4: Run lint**
Run: `pnpm lint`
Expected: PASS

**Step 5: Commit**
```bash
git add src/services/trackPlayer.service.ts AppEntry.js package.json
 git commit -m "feat: register track player service"
```

---

### Task 5: Replace AudioProvider + useAudioPlayback with Track Player

**Files:**
- Modify: `src/hooks/useAudioPlayback.ts`
- Modify: `src/components/providers/AudioProvider.tsx`
- Modify: `src/services/mediaSession.service.ts`

**Step 1: Write failing test**
Add a unit test for the status mapping helper (extract into pure function) in `src/hooks/useAudioPlayback.test.ts`.

**Step 2: Run test to verify it fails**
Run: `pnpm test src/hooks/useAudioPlayback.test.ts`
Expected: FAIL

**Step 3: Implement Track Player hook**
- Use `usePlaybackState`, `useProgress`, and Track Player events.
- Map Track Player state into the existing `AudioPlaybackStatus` shape.
- Replace lock screen metadata calls with Track Player metadata updates.

**Step 4: Update AudioProvider**
- Call `TrackPlayer.setupPlayer()` once.
- Call `TrackPlayer.updateOptions()` with capabilities, compact capabilities, and jump intervals.
- Subscribe to playback state and update `playerStore` from Track Player events.

**Step 5: Run tests**
Run: `pnpm test src/hooks/useAudioPlayback.test.ts`
Expected: PASS

**Step 6: Commit**
```bash
git add src/hooks/useAudioPlayback.ts src/hooks/useAudioPlayback.test.ts src/components/providers/AudioProvider.tsx src/services/mediaSession.service.ts
 git commit -m "feat: switch playback hook to track player"
```

---

### Task 6: Update playerStore to use Track Player queue (TDD)

**Files:**
- Modify: `src/stores/playerStore.ts`
- Modify: `src/stores/index.ts`
- Modify: `src/services/downloads.service.ts`
- Modify: `src/services/history.service.ts`
- Modify: `src/components/organisms/MiniPlayer.tsx`

**Step 1: Write failing test**
Add a test that verifies `playEpisode` builds a Track Player queue and persists snapshot.

**Step 2: Run test to verify it fails**
Run: `pnpm test src/stores/playerStore.test.ts`
Expected: FAIL

**Step 3: Implement queue-first playback**
- Build queue with `buildQueue`.
- `TrackPlayer.reset()`, `TrackPlayer.add(queue)`, `TrackPlayer.skip(index)`, `TrackPlayer.play()`.
- Persist queue snapshot on changes.

**Step 4: Run tests**
Run: `pnpm test src/stores/playerStore.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/stores/playerStore.ts src/stores/playerStore.test.ts src/components/organisms/MiniPlayer.tsx
 git commit -m "feat: drive playback from track player"
```

---

### Task 7: Restore queue on launch

**Files:**
- Modify: `src/components/providers/AudioProvider.tsx`
- Modify: `src/services/playerQueue.service.ts`

**Step 1: Write failing test**
Add a test that rehydrates snapshot to queue.

**Step 2: Run test to verify it fails**
Run: `pnpm test src/services/playerQueue.service.test.ts`
Expected: FAIL

**Step 3: Implement restore**
- Load snapshot on provider mount.
- Resolve track IDs to metadata (cache first, API fallback).
- Rebuild queue, skip to index, seek to position.

**Step 4: Run tests**
Run: `pnpm test src/services/playerQueue.service.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/providers/AudioProvider.tsx src/services/playerQueue.service.ts
 git commit -m "feat: restore queue on launch"
```

---

### Task 8: Final cleanup and QA

**Files:**
- Modify: `app.json`
- Modify: `package.json`
- Remove: `src/services/mediaSession.service.ts` (if unused)

**Step 1: Run tests**
Run: `pnpm test`
Expected: PASS

**Step 2: Lint + typecheck**
Run: `pnpm lint` and `pnpm exec tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add -A
 git commit -m "chore: finalize track player migration"
```
