/**
 * Download Queue Service - Phase 3: Resumable
 * Integrates with resumable downloads service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { Episode } from '../../types/types';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';
import { DownloadProgress, downloadsService, ResumableDownload } from '../downloads.service';

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

  private constructor() {
    console.log('📥 Download Queue Service initialized');
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

    NetInfo.addEventListener(state => {
      this._handleNetworkStateChange(state);
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      this._handleNetworkStateChange(state);
    });

    this.isInitialized = true;

    // Load queue from storage
    await this.loadQueue();
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
        console.log(`📥 Loaded ${this.queue.size} items from download queue`);
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
      console.log('⏸️ Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    try {
      const netState = await NetInfo.fetch();
      const isConnected = netState.isConnected;
      const isWifi = netState.type === 'wifi';

      if (!isConnected) {
        console.log('No network connection, pausing active downloads.');
        await this.pauseAll(); // Pause all active downloads if no network
        return;
      }

      if (this.config.wifiOnly && !isWifi) {
        console.log('WiFi-only mode enabled, but not on WiFi. Pausing active downloads.');
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
      await downloadsService.startDownload(resumableDownload);

      // Post-download completion logic
      download.status = DownloadStatus.COMPLETED;
      download.progress = 100;
      download.completedAt = Date.now();
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);
      await this.saveQueue();
      this.notify();

      await this.processQueue();

    } catch (error: any) {
      download.status = DownloadStatus.FAILED;
      download.error = error.message;
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);
      await this.saveQueue();
      this.notify();

      captureSentryException(error, { operation: 'download_queue_start', downloadId });

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
    if (download) {
      await downloadsService.cancelDownload(downloadId);
      this.queue.delete(downloadId);
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);
      addSentryBreadcrumb(`Cancelled download: ${download.episode.title}`, 'download');
      await this.saveQueue();
      this.notify();
      await this.processQueue();
    }
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
