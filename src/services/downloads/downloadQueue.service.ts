/**
 * Download Queue Service - Phase 3: Resumable
 * Integrates with resumable downloads service.
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { Episode } from '../../types/types';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';
import { DownloadProgress, downloadsService, ResumableDownload } from '../downloads.service';
import { DownloadAuthRequiredError, DownloadLimitReachedError } from '../api/downloads.api';
import { authStore, subscribeToAuthChange } from '../../stores/authStore';
import { logger } from '@/utils/logger';

const DOWNLOAD_QUEUE_KEY = 'download_queue_v1';

export enum DownloadStatus {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface QueuedDownload {
  id: string;
  episode: Episode;
  status: DownloadStatus;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number; // bytes per second
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  priority: number; // higher = more important
}

export interface DownloadQueueConfig {
  maxConcurrent: number;
  autoStart: boolean;
  wifiOnly: boolean;
}

class DownloadQueueService {
  private static instance: DownloadQueueService;

  private queue: Map<string, QueuedDownload> = new Map();
  private activeDownloads: Map<string, ResumableDownload> = new Map();
  private listeners: (() => void)[] = [];

  private config: DownloadQueueConfig = {
    maxConcurrent: 2,
    autoStart: true,
    wifiOnly: false,
  };

  private speedTrackers: Map<string, { bytes: number; timestamp: number }> = new Map();
  private isInitialized = false;
  private isProcessing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private unsubscribeAuth: (() => void) | null = null;

  private constructor() {
    logger.debug('Download Queue Service initialized');
    this._initialize();
  }

  public static getInstance(): DownloadQueueService {
    if (!DownloadQueueService.instance) {
      DownloadQueueService.instance = new DownloadQueueService();
    }
    return DownloadQueueService.instance;
  }

  private async _initialize() {
    if (this.isInitialized) return;

    // Store unsubscribe function to prevent memory leak
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      this._handleNetworkStateChange(state);
    });

    // processQueue holds everything while signed out, so something has to
    // release it again. This also covers the cold start, where the initial
    // NetInfo.fetch below can beat the async token restore: the restore itself
    // flips isAuthenticated and picks the queue back up.
    this.unsubscribeAuth = subscribeToAuthChange(isAuthenticated => {
      if (!isAuthenticated) return;
      void this.processQueue();
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      this._handleNetworkStateChange(state);
    });

    this.isInitialized = true;

    // Load queue from storage
    await this.loadQueue();
  }

  /**
   * Cleanup resources - call this when the service is no longer needed
   */
  public cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.listeners = [];
  }

  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(DOWNLOAD_QUEUE_KEY);
      if (stored) {
        const queueItems: QueuedDownload[] = JSON.parse(stored);
        this.queue.clear();
        queueItems.forEach(item => {
          // Reset downloading items to queued or paused on restart
          if (item.status === DownloadStatus.DOWNLOADING) {
            item.status = DownloadStatus.QUEUED;
          }
          this.queue.set(item.id, item);
        });
        logger.debug(`Loaded ${this.queue.size} items from download queue`);
        this.notify();
      }
    } catch (error) {
      console.error('Failed to load download queue:', error);
    }
  }

  private async saveQueue() {
    try {
      const queueItems = Array.from(this.queue.values());
      await AsyncStorage.setItem(DOWNLOAD_QUEUE_KEY, JSON.stringify(queueItems));
    } catch (error) {
      console.error('Failed to save download queue:', error);
    }
  }

  private async _handleNetworkStateChange(state: NetInfoState) {
    if (this.config.wifiOnly && state.type !== 'wifi') {
      await this.pauseAll(); // Pause all if wifiOnly and not on wifi
    } else if (!this.config.wifiOnly || state.type === 'wifi') {
      // If not wifiOnly, or on wifi, try to process queue if autoStart is true
      if (this.config.autoStart) {
        await this.processQueue();
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }


  public async addToQueue(episode: Episode, priority: number = 0): Promise<void> {
    const downloadId = episode.id;

    if (this.queue.has(downloadId)) return;
    if (downloadsService.isDownloaded(downloadId)) return;

    const queuedDownload: QueuedDownload = {
      id: downloadId,
      episode,
      status: DownloadStatus.QUEUED,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      speed: 0,
      addedAt: Date.now(),
      priority,
    };

    this.queue.set(downloadId, queuedDownload);
    await this.saveQueue();
    addSentryBreadcrumb(`Added to download queue: ${episode.title}`, 'download');
    this.notify();

    if (this.config.autoStart) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      logger.debug('Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    try {
      // Downloads are sign-in only, and the queue is persisted: items added
      // while signed in outlive that session and would otherwise replay on the
      // next launch, earning one 401 per item. Leave them QUEUED so they pick
      // up again after the user signs back in, rather than failing them.
      if (!authStore.get().isAuthenticated) {
        logger.debug('Not signed in, holding queued downloads.');
        return;
      }

      const netState = await NetInfo.fetch();
      const isConnected = netState.isConnected;
      const isWifi = netState.type === 'wifi';

      if (!isConnected) {
        logger.debug('No network connection, pausing active downloads.');
        await this.pauseAll(); // Pause all active downloads if no network
        return;
      }

      if (this.config.wifiOnly && !isWifi) {
        logger.debug('WiFi-only mode enabled, but not on WiFi. Pausing active downloads.');
        await this.pauseAll(); // Pause all active downloads if wifiOnly and not on WiFi
        return;
      }

      const queued = Array.from(this.queue.values())
        .filter(d => d.status === DownloadStatus.QUEUED)
        .sort((a, b) => b.priority - a.priority);

      for (const download of queued) {
        if (this.activeDownloads.size >= this.config.maxConcurrent) break;
        await this.startDownload(download.id);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async startDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (!download) return;

    try {
      download.status = DownloadStatus.DOWNLOADING;
      download.startedAt = Date.now();
      await this.saveQueue();
      this.notify();

      this.speedTrackers.set(downloadId, { bytes: 0, timestamp: Date.now() });

      const resumableDownload = await downloadsService.createDownload(
        download.episode,
        (progress) => this.updateProgress(downloadId, progress)
      );

      if (!resumableDownload) throw new Error('Failed to create download.');

      this.activeDownloads.set(downloadId, resumableDownload);
      const result = await downloadsService.startDownload(resumableDownload);

      if (result !== 'completed') {
        this.activeDownloads.delete(downloadId);
        this.speedTrackers.delete(downloadId);

        if (this.queue.has(downloadId) && result === 'paused') {
          download.status = DownloadStatus.PAUSED;
          await this.saveQueue();
          this.notify();
        }

        await this.processQueue();
        return;
      }

      if (!this.queue.has(downloadId) || download.status !== DownloadStatus.DOWNLOADING) {
        this.activeDownloads.delete(downloadId);
        this.speedTrackers.delete(downloadId);
        return;
      }

      download.status = DownloadStatus.COMPLETED;
      download.progress = 100;
      download.completedAt = Date.now();
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);
      await this.saveQueue();
      this.notify();

      await this.processQueue();

    } catch (error: any) {
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);

      if (this.queue.has(downloadId)) {
        download.status = DownloadStatus.FAILED;
        download.error = error.message;
        await this.saveQueue();
        this.notify();
      }

      // A refusal is an outcome, not a fault: signing out or spending the
      // monthly allowance would otherwise file one Sentry issue per queued
      // item. The download is still marked FAILED with the server's message.
      if (
        !(error instanceof DownloadAuthRequiredError) &&
        !(error instanceof DownloadLimitReachedError)
      ) {
        captureSentryException(error, { operation: 'download_queue_start', downloadId });
      }

      await this.processQueue();
    }
  }

  private updateProgress(downloadId: string, progress: DownloadProgress): void {
    const download = this.queue.get(downloadId);
    if (!download) return;

    download.progress = progress.progress * 100;
    download.bytesDownloaded = progress.bytesDownloaded;
    download.totalBytes = progress.totalBytes;

    const tracker = this.speedTrackers.get(downloadId);
    if (tracker) {
      const now = Date.now();
      const timeDiff = (now - tracker.timestamp) / 1000;
      const bytesDiff = progress.bytesDownloaded - tracker.bytes;

      if (timeDiff > 0.5) { // Update speed every 0.5s
        download.speed = bytesDiff / timeDiff;
        this.speedTrackers.set(downloadId, { bytes: progress.bytesDownloaded, timestamp: now });
      }
    }
    this.notify();
  }

  public async pauseDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (download?.status === DownloadStatus.DOWNLOADING) {
      await downloadsService.pauseDownload(downloadId);
      download.status = DownloadStatus.PAUSED;
      this.activeDownloads.delete(downloadId);
      addSentryBreadcrumb(`Paused download: ${download.episode.title}`, 'download');
      await this.saveQueue();
      this.notify();
      await this.processQueue(); // Look for next download to start
    }
  }

  public async resumeDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (download?.status === DownloadStatus.PAUSED) {
      download.status = DownloadStatus.QUEUED;
      await this.saveQueue();
      this.notify();
      await this.processQueue();
    }
  }

  public async cancelDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    // Always attempt cleanup in downloadsService even if queue state is stale.
    await downloadsService.cancelDownload(downloadId);

    if (download) {
      this.queue.delete(downloadId);
      addSentryBreadcrumb(`Cancelled download: ${download.episode.title}`, 'download');
    } else {
      addSentryBreadcrumb(`Cancelled download cleanup: ${downloadId}`, 'download');
    }

    this.activeDownloads.delete(downloadId);
    this.speedTrackers.delete(downloadId);
    await this.saveQueue();
    this.notify();
    await this.processQueue();
  }

  public getQueue(): QueuedDownload[] {
    return Array.from(this.queue.values()).sort((a, b) => b.priority - a.priority);
  }

  public getDownload(downloadId: string): QueuedDownload | null {
    return this.queue.get(downloadId) || null;
  }

  public getActiveCount(): number {
    return this.activeDownloads.size;
  }

  public getStats() {
    const queue = Array.from(this.queue.values());
    return {
      total: queue.length,
      queued: queue.filter(d => d.status === DownloadStatus.QUEUED).length,
      downloading: queue.filter(d => d.status === DownloadStatus.DOWNLOADING).length,
      paused: queue.filter(d => d.status === DownloadStatus.PAUSED).length,
      completed: queue.filter(d => d.status === DownloadStatus.COMPLETED).length,
      failed: queue.filter(d => d.status === DownloadStatus.FAILED).length,
    };
  }

  public async clearCompleted(): Promise<void> {
    for (const [id, download] of this.queue.entries()) {
      if (download.status === DownloadStatus.COMPLETED) {
        this.queue.delete(id);
      }
    }
    await this.saveQueue();
    this.notify();
  }

  public async pauseAll(): Promise<void> {
    for (const download of this.queue.values()) {
      if (download.status === DownloadStatus.DOWNLOADING) {
        await this.pauseDownload(download.id);
      }
    }
    await this.saveQueue();
    this.notify();
  }

  public async resumeAll(): Promise<void> {
    for (const download of this.queue.values()) {
      if (download.status === DownloadStatus.PAUSED) {
        download.status = DownloadStatus.QUEUED;
      }
    }
    await this.saveQueue();
    this.notify();
    await this.processQueue();
  }

  public updateConfig(config: Partial<DownloadQueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.processQueue(); // Re-evaluate queue based on new config
  }

  public getConfig(): DownloadQueueConfig {
    return { ...this.config };
  }

  public formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
    return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}

export const downloadQueueService = DownloadQueueService.getInstance();
