/**
 * Download Queue Service - Phase 3: Resumable
 * Integrates with resumable downloads service.
 */

import { downloadsService, DownloadProgress, ResumableDownload } from '../downloads.service';
import type { Episode } from '../../types/types';
import { captureSentryException, addSentryBreadcrumb } from '../config/sentry.config';

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
  
  private config: DownloadQueueConfig = {
    maxConcurrent: 2,
    autoStart: true,
    wifiOnly: false,
  };

  private speedTrackers: Map<string, { bytes: number; timestamp: number }> = new Map();

  private constructor() {
    console.log('📥 Download Queue Service initialized');
  }

  public static getInstance(): DownloadQueueService {
    if (!DownloadQueueService.instance) {
      DownloadQueueService.instance = new DownloadQueueService();
    }
    return DownloadQueueService.instance;
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
    addSentryBreadcrumb(`Added to download queue: ${episode.title}`, 'download');

    if (this.config.autoStart) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    const queued = Array.from(this.queue.values())
      .filter(d => d.status === DownloadStatus.QUEUED)
      .sort((a, b) => b.priority - a.priority);

    for (const download of queued) {
      if (this.activeDownloads.size >= this.config.maxConcurrent) break;
      await this.startDownload(download.id);
    }
  }

  private async startDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (!download) return;

    try {
      download.status = DownloadStatus.DOWNLOADING;
      download.startedAt = Date.now();
      
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

      await this.processQueue();

    } catch (error: any) {
      download.status = DownloadStatus.FAILED;
      download.error = error.message;
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);

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
  }

  public async pauseDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (download?.status === DownloadStatus.DOWNLOADING) {
      await downloadsService.pauseDownload(downloadId);
      download.status = DownloadStatus.PAUSED;
      this.activeDownloads.delete(downloadId);
      addSentryBreadcrumb(`Paused download: ${download.episode.title}`, 'download');
      await this.processQueue(); // Look for next download to start
    }
  }

  public async resumeDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (download?.status === DownloadStatus.PAUSED) {
      download.status = DownloadStatus.QUEUED;
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

  public clearCompleted(): void {
    for (const [id, download] of this.queue.entries()) {
      if (download.status === DownloadStatus.COMPLETED) {
        this.queue.delete(id);
      }
    }
  }

  public async pauseAll(): Promise<void> {
    for (const download of this.queue.values()) {
      if (download.status === DownloadStatus.DOWNLOADING) {
        await this.pauseDownload(download.id);
      }
    }
  }

  public async resumeAll(): Promise<void> {
    for (const download of this.queue.values()) {
      if (download.status === DownloadStatus.PAUSED) {
        download.status = DownloadStatus.QUEUED;
      }
    }
    await this.processQueue();
  }

  public updateConfig(config: Partial<DownloadQueueConfig>): void {
    this.config = { ...this.config, ...config };
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
