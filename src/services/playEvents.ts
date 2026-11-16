import { Platform } from 'react-native';
import AsyncStorage from 'expo-sqlite/kv-store';
import { apiClient } from './api/base.api';

/**
 * Charts rank lectures by these events, so a play is real listening: 30
 * seconds of audio heard, counted from playback ticks rather than from the
 * position, so seeking around a lecture does not count as listening to it.
 */
export const PLAY_THRESHOLD_MS = 30_000;
// The progress event fires about once a second while playing; a bigger gap is
// a suspended app or a clock change, not time spent listening.
const MAX_TICK_GAP_MS = 5_000;
const DEVICE_ID_KEY = 'play_events_device_id';

type Tick = { lectureId: string; isPlaying: boolean; nowMs: number };

export const createPlayTracker = (report: (lectureId: string) => void) => {
  let lectureId: string | null = null;
  let heardMs = 0;
  let reported = false;
  let lastPlayingAt: number | null = null;

  return {
    tick({ lectureId: id, isPlaying, nowMs }: Tick) {
      if (id !== lectureId) {
        lectureId = id;
        heardMs = 0;
        reported = false;
        lastPlayingAt = null;
      }
      if (!isPlaying) {
        lastPlayingAt = null;
        return;
      }
      if (lastPlayingAt !== null) {
        heardMs += Math.min(Math.max(nowMs - lastPlayingAt, 0), MAX_TICK_GAP_MS);
      }
      lastPlayingAt = nowMs;

      if (!reported && heardMs >= PLAY_THRESHOLD_MS && /^\d+$/.test(id)) {
        reported = true;
        report(id);
      }
    },
  };
};

let deviceIdPromise: Promise<string> | null = null;

// A random id that only lets the server ignore the same device replaying a
// lecture within minutes; it is not tied to the account or the hardware.
const getDeviceId = (): Promise<string> => {
  deviceIdPromise ??= (async () => {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  })().catch((error) => {
    deviceIdPromise = null;
    throw error;
  });
  return deviceIdPromise;
};

const sendPlayEvent = async (lectureId: string) => {
  try {
    await apiClient.post(
      '/api/play_event_api.php',
      { lecture_id: Number(lectureId), platform: Platform.OS, device_id: await getDeviceId() },
      { retry: false },
    );
  } catch {
    // A missed play only makes a chart slightly low; never worth a user-facing error.
  }
};

export const playTracker = createPlayTracker((lectureId) => {
  void sendPlayEvent(lectureId);
});
