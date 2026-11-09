/**
 * Downloads Store - Phase 3
 * Manages download state by integrating with DownloadQueueService
 */

import { entity, useEntity } from 'simpler-state';
import { downloadsService, DownloadMetadata } from '../services/downloads.service';
import { downloadQueueService, QueuedDownload, DownloadStatus } from '../services/downloads/downloadQueue.service';
import type { Episode } from '../types/types';
import { analytics } from '../services/analytics.service';

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

// Helper functions to update store (used by subscriptions)
const updateDownloads = () => {
  const downloads = downloadsService.getDownloadedLectures();
  downloadsStore.set(prev => ({ ...prev, downloads }));
};

const updateQueue = () => {
  const queueArray = downloadQueueService.getQueue() || [];
  const queueMap = new Map(queueArray.map(item => [item.id, item]));
  downloadsStore.set(prev => ({ ...prev, queue: queueMap }));
};

// Initialize service, load initial data, and subscribe to updates
// This runs once at module load, outside of React lifecycle
if (typeof window !== 'undefined') {
  downloadsService.ensureInitialized().then(() => {
    const downloads = downloadsService.getDownloadedLectures();
    const queueArray = downloadQueueService.getQueue() || [];
    const queueMap = new Map(queueArray.map(item => [item.id, item]));

    downloadsStore.set(prev => ({
      ...prev,
      downloads,
      queue: queueMap,
      isLoading: false,
    }));

    // Subscribe to service updates (these subscriptions live for the app lifetime)
    downloadsService.subscribe(updateDownloads);
    downloadQueueService.subscribe(updateQueue);
  }).catch(error => {
    console.error('Failed to initialize downloads store:', error);
    downloadsStore.set(prev => ({ ...prev, isLoading: false }));
  });
}

// Standalone action functions (no hooks, stable references)
const addToQueue = async (episode: Episode) => {
  analytics.capture('download_started', {
    lecture_id: String(episode.id),
    lecture_title: episode.title,
  });
  await downloadQueueService.addToQueue(episode);
};

const pauseDownload = async (lectureId: string) => {
  await downloadQueueService.pauseDownload(lectureId);
};

const resumeDownload = async (lectureId: string) => {
  await downloadQueueService.resumeDownload(lectureId);
};

const cancelDownload = async (lectureId: string) => {
  await downloadQueueService.cancelDownload(lectureId);
};

const deleteLecture = async (lectureId: string) => {
  await cancelDownload(lectureId);
  await downloadsService.deleteLecture(lectureId);
  updateDownloads();
};

const isDownloaded = (lectureId: string): boolean => {
  return downloadsService.isDownloaded(lectureId);
};

const refreshDownloads = async () => {
  await downloadsService.ensureInitialized();
  updateDownloads();
  updateQueue();
};

const getTotalStorageUsed = (): string => {
  return downloadsService.formatBytes(downloadsService.getTotalStorageUsed());
};

const clearAllData = async () => {
  await downloadQueueService.pauseAll();
  await downloadsService.clearAllDownloads();
  downloadsStore.set({
    queue: new Map(),
    downloads: [],
    isLoading: false,
  });
};

// Actions object with stable references
const actions = {
  addToQueue,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  deleteLecture,
  isDownloaded,
  refreshDownloads,
  getTotalStorageUsed,
  clearAllData,
};

const downloadGetters = {
  getDownloadStatus: (lectureId: string): DownloadStatus | null => {
    const queue = downloadsStore.get()?.queue;
    return queue instanceof Map ? queue.get(lectureId)?.status || null : null;
  },
  getQueuedDownload: (lectureId: string): QueuedDownload | null => {
    const queue = downloadsStore.get()?.queue;
    return queue instanceof Map ? queue.get(lectureId) || null : null;
  },
  isDownloading: (lectureId: string): boolean => {
    const queue = downloadsStore.get()?.queue;
    const status = queue instanceof Map ? queue.get(lectureId)?.status : null;
    return status === DownloadStatus.DOWNLOADING || status === DownloadStatus.QUEUED;
  },
  getDownloadProgress: (lectureId: string): number => {
    const queue = downloadsStore.get()?.queue;
    return queue instanceof Map ? queue.get(lectureId)?.progress || 0 : 0;
  },
  getDownloadError: (lectureId: string): string | null => {
    const queue = downloadsStore.get()?.queue;
    return queue instanceof Map ? queue.get(lectureId)?.error || null : null;
  },
};

export const useDownloadsStore = () => {
  const rawState = useEntity(downloadsStore);

  // Ensure state is always properly shaped
  const state: DownloadState = {
    ...initialState,
    ...(rawState || {}),
    queue: rawState?.queue instanceof Map ? rawState.queue : new Map(),
    downloads: Array.isArray(rawState?.downloads) ? rawState.downloads : [],
  };

  return {
    ...state,
    ...actions,
    ...downloadGetters,
  };
};
