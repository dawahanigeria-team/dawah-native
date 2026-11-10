import TrackPlayer, { Event, State } from '../../services/expoTrackPlayerCompat';
import { historyService } from '../../services/history.service';
import { logger } from '../../utils/logger';

/**
 * Position writes during playback are throttled to one per 15s, so a seek made
 * just before pausing would otherwise never be saved. Every pause path (in-app,
 * lock screen, sleep timer) ends in this state, so it is the one place to save.
 */
export const saveResumePositionOnPause = () =>
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    if (state !== State.Paused) return;
    void (async () => {
      try {
        const track = await TrackPlayer.getActiveTrack();
        const { position } = await TrackPlayer.getProgress();
        if (track && position > 0) await historyService.updateProgress(String(track.id), position);
      } catch (error) {
        logger.warn('Could not save the paused position', error);
      }
    })();
  });
