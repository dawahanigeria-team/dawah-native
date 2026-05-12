/**
 * Downloads Store - Phase 3
 * Manages download state by integrating with DownloadQueueService
 */

import { useRef } from 'react';
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

export const useDownloadsStore = () => {
  const rawState = downloadsStore.use();

  // Ensure state is always properly shaped
  const state: DownloadState = {
    ...initialState,
    ...(rawState || {}),
    queue: rawState?.queue instanceof Map ? rawState.queue : new Map(),
    downloads: Array.isArray(rawState?.downloads) ? rawState.downloads : [],
  };

  // Create stable getter function references using useRef
  // These functions always read the latest state from the store when called
  const gettersRef = useRef({
    getDownloadStatus: (lectureId: string): DownloadStatus | null => {
      const currentState = downloadsStore.get();
      const queue = currentState?.queue instanceof Map ? currentState.queue : new Map();
      const download = queue.get(lectureId);
      return download?.status || null;
    },
    getQueuedDownload: (lectureId: string): QueuedDownload | null => {
      const currentState = downloadsStore.get();
      const queue = currentState?.queue instanceof Map ? currentState.queue : new Map();
      return queue.get(lectureId) || null;
    },
    isDownloading: (lectureId: string): boolean => {
      const currentState = downloadsStore.get();
      const queue = currentState?.queue instanceof Map ? currentState.queue : new Map();
      const download = queue.get(lectureId);
      const status = download?.status || null;
      return status === DownloadStatus.DOWNLOADING || status === DownloadStatus.QUEUED;
    },
    getDownloadProgress: (lectureId: string): number => {
      const currentState = downloadsStore.get();
      const queue = currentState?.queue instanceof Map ? currentState.queue : new Map();
      return queue.get(lectureId)?.progress || 0;
    },
    getDownloadError: (lectureId: string): string | null => {
      const currentState = downloadsStore.get();
      const queue = currentState?.queue instanceof Map ? currentState.queue : new Map();
      return queue.get(lectureId)?.error || null;
    },
  });

  return {
    ...state,
    ...actions,
    ...gettersRef.current,
  };
};
