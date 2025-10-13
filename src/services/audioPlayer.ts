import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';

type PlaybackStatusCallback = (status: AudioStatus) => void;

export class AudioPlayerService {
  private player: AudioPlayer | null = null;
  private onStatusUpdate: PlaybackStatusCallback | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(statusCallback?: PlaybackStatusCallback | null) {
    this.onStatusUpdate = statusCallback || null;
    this.initializeAudio();
  }

  setStatusCallback(callback: PlaybackStatusCallback) {
    this.onStatusUpdate = callback;
  }

  private async initializeAudio() {
    if (this.isInitializing) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this._initializeAudio();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  private async _initializeAudio() {
    try {
      // Set audio mode for background playback
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
      });

      // Create a new AudioPlayer instance
      this.player = createAudioPlayer();

      // Set up status change listener
      this.player.addListener('playbackStatusUpdate', this.onPlaybackStatusUpdate);

      console.log('Audio player initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      this.player = null;
      throw error;
    }
  }

  async playEpisode(episode: any) {
    // Ensure initialization is complete
    if (this.isInitializing && this.initializationPromise) {
      console.log('Waiting for audio player initialization...');
      try {
        await this.initializationPromise;
      } catch (error) {
        console.error('Audio player initialization failed:', error);
        return;
      }
    }

    // If player is not initialized yet, try to initialize it now
    if (!this.player) {
      console.log('Player not initialized, attempting to initialize...');
      try {
        await this.initializeAudio();
      } catch (error) {
        console.error('Failed to initialize audio player:', error);
        return;
      }
    }

    // Double check player is available after initialization attempt
    if (!this.player) {
      console.error('Audio player is not available after initialization');
      return;
    }

    if (!episode?.audioUrl) {
      console.error('Episode audio URL is missing');
      return;
    }

    try {
      // Always stop current playback and replace with new audio
      // This ensures only one audio plays at a time
      this.player.pause();
      this.player.replace({ uri: episode.audioUrl });
      this.player.play();

      console.log('Playing episode:', episode.title);

    } catch (error) {
      console.error('Failed to play episode:', error);
    }
  }

  async togglePlayPause() {
    if (!this.player) return;

    try {
      if (this.player.playing) {
        this.player.pause();
      } else {
        this.player.play();
      }
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
    }
  }

  async seekTo(position: number) {
    if (!this.player) return;

    try {
      await this.player.seekTo(position);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }

  async setVolume(volume: number) {
    if (!this.player) return;

    try {
      this.player.volume = volume;
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  async setPlaybackRate(rate: number) {
    if (!this.player) return;

    try {
      this.player.setPlaybackRate(rate);
    } catch (error) {
      console.error('Failed to set playback rate:', error);
    }
  }

  private onPlaybackStatusUpdate = (status: AudioStatus) => {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(status);
    }
  };

  async cleanup() {
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
        this.player = null;
      } catch (error) {
        console.error('Failed to cleanup audio player:', error);
      }
    }
  }
}

export const audioPlayer = new AudioPlayerService();
