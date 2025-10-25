/**
 * Downloads Store
 * Manages download state and operations
 */

import { entity } from 'simpler-state';
import { downloadsService, DownloadMetadata, DownloadProgress } from '../services/downloads.service';
import type { Episode } from '../types/types';

export interface DownloadState {
  // Map of lectureId to download progress
  activeDownloads: Map<string, DownloadProgress>;
  // List of downloaded lectures
  downloads: DownloadMetadata[];
  // Map of lectureId to error message
  downloadErrors: Map<string, string>;
  // Loading state
  isLoading: boolean;
}

const initialState: DownloadState = {
  activeDownloads: new Map(),
  downloads: [],
  downloadErrors: new Map(),
  isLoading: false,
};

export const downloadsStore = entity(initialState);

// Load initial downloads on app start
if (typeof window !== 'undefined') {
  // Wait for downloads service to initialize, then load downloads
  downloadsService.ensureInitialized().then(() => {
    const downloads = downloadsService.getDownloadedLectures();
    console.log('🗄️ Downloads Store: Loaded', downloads.length, 'downloads');
    downloadsStore.set(prev => ({ ...prev, downloads }));
  }).catch(error => {
    console.error('Failed to initialize downloads store:', error);
  });
}

export const useDownloadsStore = () => {
  const state = downloadsStore.use();

  const downloadLecture = async (episode: Episode) => {
    const { id: lectureId } = episode;

    // Check if already downloaded
    if (downloadsService.isDownloaded(lectureId)) {
      console.log(`Lecture ${lectureId} is already downloaded`);
      return;
    }

    // Check if already downloading
    if (state.activeDownloads.has(lectureId)) {
      console.log(`Lecture ${lectureId} is already being downloaded`);
      return;
    }

    // Clear any previous errors
    const newErrors = new Map(state.activeDownloads);
    newErrors.delete(lectureId);
    downloadsStore.set(prev => ({ ...prev, downloadErrors: newErrors }));

    try {
      // Start download
      console.log(`Starting download for: ${episode.title}`);

      await downloadsService.downloadLecture(episode, (progress) => {
        // Update progress
        downloadsStore.set(prev => ({
          ...prev,
          activeDownloads: new Map(prev.activeDownloads).set(lectureId, progress),
        }));
      });

      // Download completed - remove from active downloads
      const newActiveDownloads = new Map(state.activeDownloads);
      newActiveDownloads.delete(lectureId);

      // Refresh downloads list
      const downloads = downloadsService.getDownloadedLectures();

      downloadsStore.set(prev => ({
        ...prev,
        activeDownloads: newActiveDownloads,
        downloads,
      }));

      console.log(`✅ Download completed: ${episode.title}`);

    } catch (error: any) {
      console.error(`Download failed for ${lectureId}:`, error);

      // Remove from active downloads and add to errors
      const newActiveDownloads = new Map(state.activeDownloads);
      newActiveDownloads.delete(lectureId);

      const newErrors = new Map(state.downloadErrors);
      newErrors.set(lectureId, error.message || 'Download failed');

      downloadsStore.set(prev => ({
        ...prev,
        activeDownloads: newActiveDownloads,
        downloadErrors: newErrors,
      }));
    }
  };

  const deleteLecture = async (lectureId: string) => {
    try {
      await downloadsService.deleteLecture(lectureId);

      // Refresh downloads list
      const downloads = downloadsService.getDownloadedLectures();

      downloadsStore.set(prev => ({
        ...prev,
        downloads,
      }));

      console.log(`Deleted lecture: ${lectureId}`);
    } catch (error) {
      console.error(`Failed to delete lecture ${lectureId}:`, error);
    }
  };

  const isDownloaded = (lectureId: string): boolean => {
    return downloadsService.isDownloaded(lectureId);
  };

  const isDownloading = (lectureId: string): boolean => {
    return state.activeDownloads.has(lectureId);
  };

  const getDownloadProgress = (lectureId: string): number => {
    return state.activeDownloads.get(lectureId)?.progress || 0;
  };

  const getDownloadError = (lectureId: string): string | null => {
    return state.downloadErrors.get(lectureId) || null;
  };

  const refreshDownloads = async () => {
    await downloadsService.ensureInitialized();
    const downloads = downloadsService.getDownloadedLectures();
    console.log('🔄 Refresh: Found', downloads.length, 'downloads');
    downloadsStore.set(prev => ({ ...prev, downloads }));
  };

  const getTotalStorageUsed = (): string => {
    const bytes = downloadsService.getTotalStorageUsed();
    return downloadsService.formatBytes(bytes);
  };

  const clearAllDownloads = async () => {
    try {
      await downloadsService.clearAllDownloads();
      downloadsStore.set(prev => ({
        ...prev,
        downloads: [],
        activeDownloads: new Map(),
        downloadErrors: new Map(),
      }));
    } catch (error) {
      console.error('Failed to clear all downloads:', error);
    }
  };

  return {
    downloads: state.downloads,
    activeDownloads: state.activeDownloads,
    downloadErrors: state.downloadErrors,
    isLoading: state.isLoading,
    downloadLecture,
    deleteLecture,
    isDownloaded,
    isDownloading,
    getDownloadProgress,
    getDownloadError,
    refreshDownloads,
    getTotalStorageUsed,
    clearAllDownloads,
  };
};
