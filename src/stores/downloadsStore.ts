/**
 * Downloads Store - Phase 3
 * Manages download state by integrating with DownloadQueueService
 */

import { useCallback, useEffect } from 'react';
import { entity } from 'simpler-state';
import { downloadsService, DownloadMetadata } from '../services/downloads.service';
import { downloadQueueService, QueuedDownload, DownloadStatus } from '../services/downloads/downloadQueue.service';
import type { Episode } from '../types/types';

export interface DownloadState {
  queue: Map<string, QueuedDownload>;
  downloads: DownloadMetadata[];
  isLoading: boolean;
}

const initialState: DownloadState = {
  queue: new Map(),
  downloads: [],
  isLoading: true,
};

export const downloadsStore = entity(initialState);

// Initialize service and load initial data
if (typeof window !== 'undefined') {
  downloadsService.ensureInitialized().then(() => {
    const downloads = downloadsService.getDownloadedLectures();
    downloadsStore.set(prev => ({ 
      ...prev, 
      downloads,
      isLoading: false,
    }));
  }).catch(error => {
    console.error('Failed to initialize downloads store:', error);
    downloadsStore.set(prev => ({ ...prev, isLoading: false }));
  });
}

export const useDownloadsStore = () => {
  const state = downloadsStore.use();

  // Subscribe to service updates
  useEffect(() => {
    const updateDownloads = () => {
      const downloads = downloadsService.getDownloadedLectures();
      downloadsStore.set(prev => ({ ...prev, downloads }));
    };

    const updateQueue = () => {
      const queueArray = downloadQueueService.getQueue();
      const queueMap = new Map(queueArray.map(item => [item.id, item]));
      downloadsStore.set(prev => ({ ...prev, queue: queueMap }));
    };

    const unsubscribeDownloads = downloadsService.subscribe(updateDownloads);
    const unsubscribeQueue = downloadQueueService.subscribe(updateQueue);

    return () => {
      unsubscribeDownloads();
      unsubscribeQueue();
    };
  }, []);

  const addToQueue = useCallback(async (episode: Episode) => {
    await downloadQueueService.addToQueue(episode);
  }, []);

  const pauseDownload = useCallback(async (lectureId: string) => {
    await downloadQueueService.pauseDownload(lectureId);
  }, []);

  const resumeDownload = useCallback(async (lectureId: string) => {
    await downloadQueueService.resumeDownload(lectureId);
  }, []);
  
  const cancelDownload = useCallback(async (lectureId: string) => {
    await downloadQueueService.cancelDownload(lectureId);
    // Also explicitly delete to clean up any partial metadata
    await downloadsService.deleteLecture(lectureId);
  }, []);

  const deleteLecture = useCallback(async (lectureId: string) => {
    await cancelDownload(lectureId); // Ensures it's removed from queue
    await downloadsService.deleteLecture(lectureId);
    const downloads = downloadsService.getDownloadedLectures();
    downloadsStore.set(prev => ({ ...prev, downloads }));
  }, [cancelDownload]);

  const isDownloaded = useCallback((lectureId: string): boolean => {
    return downloadsService.isDownloaded(lectureId);
  }, []);

  const getDownloadStatus = useCallback((lectureId: string): DownloadStatus | null => {
    const download = state.queue.get(lectureId);
    return download?.status || null;
  }, [state.queue]);

  const isDownloading = useCallback((lectureId: string): boolean => {
    const status = getDownloadStatus(lectureId);
    return status === DownloadStatus.DOWNLOADING || status === DownloadStatus.QUEUED;
  }, [getDownloadStatus]);
  
  const getQueuedDownload = useCallback((lectureId: string): QueuedDownload | null => {
    return state.queue.get(lectureId) || null;
  }, [state.queue]);

  const getDownloadProgress = useCallback((lectureId: string): number => {
    return getQueuedDownload(lectureId)?.progress || 0;
  }, [getQueuedDownload]);
  
  const getDownloadError = useCallback((lectureId: string): string | null => {
    return getQueuedDownload(lectureId)?.error || null;
  }, [getQueuedDownload]);

  const refreshDownloads = useCallback(async () => {
    await downloadsService.ensureInitialized();
    const downloads = downloadsService.getDownloadedLectures();
    const queueArray = downloadQueueService.getQueue();
    const queueMap = new Map(queueArray.map(item => [item.id, item]));
    downloadsStore.set(prev => ({ ...prev, downloads, queue: queueMap }));
  }, []);

  const getTotalStorageUsed = useCallback((): string => {
    return downloadsService.formatBytes(downloadsService.getTotalStorageUsed());
  }, []);

  const clearAllData = useCallback(async () => {
    await downloadQueueService.pauseAll();
    await downloadsService.clearAllDownloads();
    downloadsStore.set({
      queue: new Map(),
      downloads: [],
      isLoading: false,
    });
  }, []);

  return {
    ...state,
    addToQueue,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteLecture,
    isDownloaded,
    isDownloading,
    getDownloadStatus,
    getQueuedDownload,
    getDownloadProgress,
    getDownloadError,
    refreshDownloads,
    getTotalStorageUsed,
    clearAllData,
  };
};
