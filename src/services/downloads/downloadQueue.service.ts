/**
 * Download Queue Service - Phase 2
 * Advanced download management with queue, pause/resume
 *
 * Features:
 * - Download queue (multiple simultaneous downloads)
 * - Pause/resume individual downloads
 * - Download speed tracking
 * - Priority management
 * - Background downloads
 */

import { downloadsService, DownloadProgress } from '../downloads.service';
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
  maxConcurrent: number; // Max simultaneous downloads
  autoStart: boolean;     // Auto-start downloads when added
  wifiOnly: boolean;      // Only download on WiFi
}

class DownloadQueueService {
  private static instance: DownloadQueueService;

  private queue: Map<string, QueuedDownload> = new Map();
  private activeDownloads: Set<string> = new Set();

  private config: DownloadQueueConfig = {
    maxConcurrent: 2,
    autoStart: true,
    wifiOnly: false,
  };

  // Abort controllers for active downloads
  private abortControllers: Map<string, AbortController> = new Map();

  // Speed tracking
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

  /**
   * Add download to queue
   */
  public async addToQueue(
    episode: Episode,
    priority: number = 0
  ): Promise<void> {
    const downloadId = episode.id;

    // Check if already in queue or downloaded
    if (this.queue.has(downloadId)) {
      console.log(`⚠️ Download already in queue: ${downloadId}`);
      return;
    }

    if (downloadsService.isDownloaded(downloadId)) {
      console.log(`✅ Already downloaded: ${downloadId}`);
      return;
    }

    // Create queued download
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
    console.log(`📥 Added to queue: ${episode.title} (priority: ${priority})`);

    addSentryBreadcrumb(
      `Added to download queue: ${episode.title}`,
      'download',
      { downloadId, priority }
    );

    // Auto-start if enabled
    if (this.config.autoStart) {
      await this.processQueue();
    }
  }

  /**
   * Process download queue
   */
  private async processQueue(): Promise<void> {
    // Get queued downloads sorted by priority
    const queuedDownloads = Array.from(this.queue.values())
      .filter(d => d.status === DownloadStatus.QUEUED)
      .sort((a, b) => b.priority - a.priority);

    // Start downloads up to max concurrent
    for (const download of queuedDownloads) {
      if (this.activeDownloads.size >= this.config.maxConcurrent) {
        break;
      }

      await this.startDownload(download.id);
    }
  }

  /**
   * Start individual download
   */
  private async startDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (!download) return;

    try {
      // Update status
      download.status = DownloadStatus.DOWNLOADING;
      download.startedAt = Date.now();
      this.activeDownloads.add(downloadId);

      console.log(`▶️ Starting download: ${download.episode.title}`);

      // Initialize speed tracker
      this.speedTrackers.set(downloadId, {
        bytes: 0,
        timestamp: Date.now(),
      });

      // Download with progress tracking
      await downloadsService.downloadLecture(
        download.episode,
        (progress: DownloadProgress) => {
          this.updateProgress(downloadId, progress);
        }
      );

      // Mark as completed
      download.status = DownloadStatus.COMPLETED;
      download.progress = 100;
      download.completedAt = Date.now();
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);

      console.log(`✅ Download completed: ${download.episode.title}`);

      // Continue processing queue
      await this.processQueue();
    } catch (error: any) {
      download.status = DownloadStatus.FAILED;
      download.error = error.message;
      this.activeDownloads.delete(downloadId);
      this.speedTrackers.delete(downloadId);

      console.error(`❌ Download failed: ${download.episode.title}`, error);

      captureSentryException(error, {
        operation: 'download_queue_start',
        downloadId,
        title: download.episode.title,
      });

      // Continue processing queue
      await this.processQueue();
    }
  }

  /**
   * Update download progress
   */
  private updateProgress(downloadId: string, progress: DownloadProgress): void {
    const download = this.queue.get(downloadId);
    if (!download) return;

    // Update progress
    download.progress = progress.progress * 100;
    download.bytesDownloaded = progress.bytesDownloaded;
    download.totalBytes = progress.totalBytes;

    // Calculate speed
    const tracker = this.speedTrackers.get(downloadId);
    if (tracker) {
      const now = Date.now();
      const timeDiff = (now - tracker.timestamp) / 1000; // seconds
      const bytesDiff = progress.bytesDownloaded - tracker.bytes;

      if (timeDiff > 0) {
        download.speed = bytesDiff / timeDiff;

        // Update tracker
        this.speedTrackers.set(downloadId, {
          bytes: progress.bytesDownloaded,
          timestamp: now,
        });
      }
    }
  }

  /**
   * Pause download
   */
  public pauseDownload(downloadId: string): void {
    const download = this.queue.get(downloadId);
    if (!download || download.status !== DownloadStatus.DOWNLOADING) {
      return;
    }

    // Abort the download
    const controller = this.abortControllers.get(downloadId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(downloadId);
    }

    download.status = DownloadStatus.PAUSED;
    this.activeDownloads.delete(downloadId);

    console.log(`⏸️ Paused download: ${download.episode.title}`);

    addSentryBreadcrumb(
      `Paused download: ${download.episode.title}`,
      'download',
      { downloadId }
    );
  }

  /**
   * Resume download
   */
  public async resumeDownload(downloadId: string): Promise<void> {
    const download = this.queue.get(downloadId);
    if (!download || download.status !== DownloadStatus.PAUSED) {
      return;
    }

    download.status = DownloadStatus.QUEUED;
    console.log(`▶️ Resumed download: ${download.episode.title}`);

    await this.processQueue();
  }

  /**
   * Cancel download
   */
  public cancelDownload(downloadId: string): void {
    const download = this.queue.get(downloadId);
    if (!download) return;

    // Abort if downloading
    if (download.status === DownloadStatus.DOWNLOADING) {
      const controller = this.abortControllers.get(downloadId);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(downloadId);
      }
    }

    // Remove from queue
    this.queue.delete(downloadId);
    this.activeDownloads.delete(downloadId);
    this.speedTrackers.delete(downloadId);

    console.log(`❌ Cancelled download: ${download.episode.title}`);

    addSentryBreadcrumb(
      `Cancelled download: ${download.episode.title}`,
      'download',
      { downloadId }
    );
  }

  /**
   * Get queue state
   */
  public getQueue(): QueuedDownload[] {
    return Array.from(this.queue.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get download by ID
   */
  public getDownload(downloadId: string): QueuedDownload | null {
    return this.queue.get(downloadId) || null;
  }

  /**
   * Get active downloads count
   */
  public getActiveCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Get queue statistics
   */
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

  /**
   * Clear completed downloads from queue
   */
  public clearCompleted(): void {
    for (const [id, download] of this.queue.entries()) {
      if (download.status === DownloadStatus.COMPLETED) {
        this.queue.delete(id);
      }
    }
    console.log('🧹 Cleared completed downloads from queue');
  }

  /**
   * Pause all downloads
   */
  public pauseAll(): void {
    for (const [id, download] of this.queue.entries()) {
      if (download.status === DownloadStatus.DOWNLOADING) {
        this.pauseDownload(id);
      }
    }
    console.log('⏸️ Paused all downloads');
  }

  /**
   * Resume all paused downloads
   */
  public async resumeAll(): Promise<void> {
    for (const [id, download] of this.queue.entries()) {
      if (download.status === DownloadStatus.PAUSED) {
        download.status = DownloadStatus.QUEUED;
      }
    }
    await this.processQueue();
    console.log('▶️ Resumed all downloads');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DownloadQueueConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Download queue config updated:', this.config);
  }

  /**
   * Get configuration
   */
  public getConfig(): DownloadQueueConfig {
    return { ...this.config };
  }

  /**
   * Format download speed
   */
  public formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';

    const units = ['B/s', 'KB/s', 'MB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
    const value = bytesPerSecond / Math.pow(1024, i);

    return `${value.toFixed(1)} ${units[i]}`;
  }
}

export const downloadQueueService = DownloadQueueService.getInstance();
