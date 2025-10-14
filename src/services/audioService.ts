/**
 * Audio Service
 * Handles all audio playback operations using Expo AV
 */

import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

class AudioService {
  private sound: Audio.Sound | null = null;
  private isInitialized = false;
  private playbackStatusUpdateCallback: ((status: AVPlaybackStatus) => void) | null = null;

  /**
   * Initialize audio service with proper background playback settings
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set audio mode for background playback
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('Audio service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      throw error;
    }
  }

  /**
   * Set playback status update callback
   */
  setPlaybackStatusUpdateCallback(callback: (status: AVPlaybackStatus) => void) {
    this.playbackStatusUpdateCallback = callback;

    // If we have an active sound, set the callback
    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate(callback);
    }
  }

  /**
   * Load and prepare an audio file for playback
   */
  async loadAudio(uri: string): Promise<void> {
    try {
      console.log('🎵 AudioService: Starting to load audio');
      console.log('🔗 AudioService: URI:', uri);

      // Ensure audio service is initialized
      await this.initialize();

      // Unload previous sound if exists
      await this.unloadAudio();

      console.log('📥 AudioService: Creating sound object from URI:', uri);

      // Create and load the sound
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          progressUpdateIntervalMillis: 1000,
          positionMillis: 0,
        },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;

      // Set the callback if one was provided
      if (this.playbackStatusUpdateCallback) {
        this.sound.setOnPlaybackStatusUpdate(this.playbackStatusUpdateCallback);
      }

      console.log('✅ AudioService: Audio loaded successfully!');
      console.log('📊 AudioService: Status:', status);
    } catch (error) {
      console.error('Failed to load audio:', error);
      throw error;
    }
  }

  /**
   * Internal playback status update handler
   */
  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (this.playbackStatusUpdateCallback) {
      this.playbackStatusUpdateCallback(status);
    }

    if (status.isLoaded) {
      if (status.didJustFinish && !status.isLooping) {
        console.log('Audio playback finished');
      }
    }
  };

  /**
   * Play the currently loaded audio
   */
  async play(): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded. Call loadAudio() first.');
    }

    try {
      const status = await this.sound.getStatusAsync();

      if (status.isLoaded && !status.isPlaying) {
        console.log('▶️ AudioService: Starting playback...');
        await this.sound.playAsync();
        console.log('🎶 AudioService: Playback started!');
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  /**
   * Pause the currently playing audio
   */
  async pause(): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      const status = await this.sound.getStatusAsync();

      if (status.isLoaded && status.isPlaying) {
        console.log('Pausing playback');
        await this.sound.pauseAsync();
      }
    } catch (error) {
      console.error('Failed to pause audio:', error);
      throw error;
    }
  }

  /**
   * Toggle between play and pause
   */
  async togglePlayPause(): Promise<boolean> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      const status = await this.sound.getStatusAsync();

      if (status.isLoaded) {
        if (status.isPlaying) {
          await this.pause();
          return false; // Now paused
        } else {
          await this.play();
          return true; // Now playing
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
      throw error;
    }
  }

  /**
   * Seek to a specific position in milliseconds
   */
  async seekTo(positionMillis: number): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      await this.sound.setPositionAsync(positionMillis);
      console.log('Seeked to position:', positionMillis);
    } catch (error) {
      console.error('Failed to seek:', error);
      throw error;
    }
  }

  /**
   * Seek forward by a specified number of seconds
   */
  async seekForward(seconds: number = 15): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      const status = await this.sound.getStatusAsync();

      if (status.isLoaded && status.positionMillis !== undefined && status.durationMillis !== undefined) {
        const newPosition = Math.min(
          status.positionMillis + (seconds * 1000),
          status.durationMillis
        );
        await this.seekTo(newPosition);
      }
    } catch (error) {
      console.error('Failed to seek forward:', error);
      throw error;
    }
  }

  /**
   * Seek backward by a specified number of seconds
   */
  async seekBackward(seconds: number = 15): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      const status = await this.sound.getStatusAsync();

      if (status.isLoaded && status.positionMillis !== undefined) {
        const newPosition = Math.max(
          status.positionMillis - (seconds * 1000),
          0
        );
        await this.seekTo(newPosition);
      }
    } catch (error) {
      console.error('Failed to seek backward:', error);
      throw error;
    }
  }

  /**
   * Set playback rate (speed)
   */
  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      await this.sound.setRateAsync(rate, true);
      console.log('Playback rate set to:', rate);
    } catch (error) {
      console.error('Failed to set playback rate:', error);
      throw error;
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }

    try {
      await this.sound.setVolumeAsync(volume);
      console.log('Volume set to:', volume);
    } catch (error) {
      console.error('Failed to set volume:', error);
      throw error;
    }
  }

  /**
   * Get current playback status
   */
  async getStatus(): Promise<AVPlaybackStatus | null> {
    if (!this.sound) {
      return null;
    }

    try {
      const status = await this.sound.getStatusAsync();
      return status;
    } catch (error) {
      console.error('Failed to get status:', error);
      return null;
    }
  }

  /**
   * Stop playback and reset position
   */
  async stop(): Promise<void> {
    if (!this.sound) {
      return;
    }

    try {
      await this.sound.stopAsync();
      await this.sound.setPositionAsync(0);
      console.log('Playback stopped');
    } catch (error) {
      console.error('Failed to stop audio:', error);
      throw error;
    }
  }

  /**
   * Unload the current audio file
   */
  async unloadAudio(): Promise<void> {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();

        // Stop if playing
        if (status.isLoaded && status.isPlaying) {
          await this.sound.stopAsync();
        }

        // Unload the sound
        await this.sound.unloadAsync();
        this.sound = null;
        console.log('Audio unloaded');
      } catch (error) {
        console.error('Failed to unload audio:', error);
        this.sound = null;
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.unloadAudio();
    this.playbackStatusUpdateCallback = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Export type for playback status
export type { AVPlaybackStatus };