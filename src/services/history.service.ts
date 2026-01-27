/**
 * History Service
 * Tracks recently played lectures locally (privacy-focused)
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import type { Episode } from '../types/types';

export interface HistoryItem {
  lectureId: string;
  title: string;
  lecturerName: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  playedAt: string; // ISO timestamp
  progress: number; // Playback position in seconds
  language?: string;
}

class HistoryService {
  private readonly HISTORY_KEY = 'lecture_history';
  private readonly MAX_HISTORY_ITEMS = 100; // Keep last 100 played lectures

  /**
   * Add lecture to history (called when playback starts)
   */
  async addToHistory(episode: Episode, progress: number = 0): Promise<void> {
    try {
      const history = await this.getHistory();

      // Remove existing entry if present (to update timestamp)
      const filteredHistory = history.filter(
        item => item.lectureId !== episode.id
      );

      // Create new history item
      const historyItem: HistoryItem = {
        lectureId: episode.id,
        title: episode.title,
        lecturerName: episode.lecturerName || 'Unknown',
        coverUrl: episode.coverUrl || '',
        audioUrl: episode.audioUrl,
        duration: episode.durationSec || 0,
        playedAt: new Date().toISOString(),
        progress,
        language: episode.language,
      };

      // Add to beginning of array (most recent first)
      const updatedHistory = [historyItem, ...filteredHistory];

      // Limit to max items
      const trimmedHistory = updatedHistory.slice(0, this.MAX_HISTORY_ITEMS);

      // Save to storage
      await AsyncStorage.setItem(
        this.HISTORY_KEY,
        JSON.stringify(trimmedHistory)
      );

      console.log(`📚 Added to history: ${episode.title}`);
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  }

  /**
   * Get full history
   */
  async getHistory(): Promise<HistoryItem[]> {
    try {
      const historyJson = await AsyncStorage.getItem(this.HISTORY_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * Get history as Episodes (for library screen)
   */
  async getHistoryAsEpisodes(): Promise<Episode[]> {
    const history = await this.getHistory();

    return history.map(item => ({
      id: item.lectureId,
      title: item.title,
      lecturerName: item.lecturerName,
      durationSec: item.duration,
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl,
      seriesId: '',
      plays: 0,
      liked: false,
      language: item.language || '',
      downloads: 0,
      createdAt: item.playedAt,
    }));
  }

  /**
   * Update progress for a lecture
   */
  async updateProgress(lectureId: string, progress: number): Promise<void> {
    try {
      const history = await this.getHistory();
      const itemIndex = history.findIndex(item => item.lectureId === lectureId);

      if (itemIndex !== -1) {
        history[itemIndex].progress = progress;
        history[itemIndex].playedAt = new Date().toISOString();

        await AsyncStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  /**
   * Get progress for a lecture
   */
  async getProgress(lectureId: string): Promise<number> {
    try {
      const history = await this.getHistory();
      const item = history.find(h => h.lectureId === lectureId);
      return item?.progress || 0;
    } catch (error) {
      console.error('Failed to get progress:', error);
      return 0;
    }
  }

  /**
   * Remove item from history
   */
  async removeFromHistory(lectureId: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(item => item.lectureId !== lectureId);

      await AsyncStorage.setItem(this.HISTORY_KEY, JSON.stringify(filteredHistory));

      console.log(`🗑️ Removed from history: ${lectureId}`);
    } catch (error) {
      console.error('Failed to remove from history:', error);
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.HISTORY_KEY);
      console.log('🗑️ History cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Get recently played count
   */
  async getHistoryCount(): Promise<number> {
    const history = await this.getHistory();
    return history.length;
  }
}

export const historyService = new HistoryService();
