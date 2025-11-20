/**
 * Downloads Service - Phase 2: Resumable Downloads
 * Uses expo-file-system's DownloadResumable for pausable/resumable downloads.
 */

import * as FileSystem from 'expo-file-system';
import { Directory, File, Paths } from 'expo-file-system';
import { createDownloadResumable } from 'expo-file-system/legacy';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Episode } from '../types/types';
import { downloadsApi } from './api/downloads.api';
import { captureSentryException } from './config/sentry.config';

const DOWNLOADS_METADATA_KEY = 'downloads_metadata';

export interface DownloadMetadata {
  lectureId: string;
  title: string;
  lecturerName: string;
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
  downloadedAt: string;
  fileSize?: number;
  resumableData?: string; // To store resumable state
}

export interface DownloadProgress {
  lectureId: string;
  progress: number; // 0-1
  bytesDownloaded: number;
  totalBytes: number;
}

export interface ResumableDownload {
  id: string;
  downloader: FileSystem.DownloadResumable;
  episode: Episode;
  progressCallback: (progress: DownloadProgress) => void;
}

class DownloadsService {
  private downloadsDirectory: Directory;
  private metadataCache: Map<string, DownloadMetadata> = new Map();
  private activeDownloads: Map<string, ResumableDownload> = new Map();
  private listeners: (() => void)[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.downloadsDirectory = new Directory(Paths.document, 'downloads');
    this.initPromise = this.initialize();
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

  private async initialize(): Promise<void> {
    await this.ensureDirExists();
    await this.loadMetadataCache();
    this.isInitialized = true;
    console.log('📦 Downloads Service Initialized');
  }

  private async ensureDirExists(): Promise<void> {
    if (!this.downloadsDirectory.exists) {
      await this.downloadsDirectory.create();
    }
  }

  private async loadMetadataCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      if (stored) {
        const metadata: DownloadMetadata[] = JSON.parse(stored);
        metadata.forEach(item => this.metadataCache.set(item.lectureId, item));
      }
    } catch (error) {
      console.error('Failed to load downloads metadata:', error);
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async saveMetadata(): Promise<void> {
    const metadata = Array.from(this.metadataCache.values());
    await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(metadata));
  }

  private getDownloadFile(lectureId: string): File {
    return new File(this.downloadsDirectory, `${lectureId}.mp3`);
  }

  private getPartialDownloadFile(lectureId: string): File {
    return new File(this.downloadsDirectory, `${lectureId}.part`);
  }

  isDownloaded(lectureId: string): boolean {
    const file = this.getDownloadFile(lectureId);
    return file.exists && this.metadataCache.has(lectureId) && !this.metadataCache.get(lectureId)?.resumableData;
  }



  public async hasEnoughStorage(requiredBytes: number): Promise<boolean> {
    const freeDiskStorage = await Directory.getFreeDiskStorageAsync();
    return freeDiskStorage > requiredBytes;
  }

  async createDownload(
    episode: Episode,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<ResumableDownload | null> {
    const { id: lectureId, audioUrl } = episode;

    if (!audioUrl) {
      throw new Error('No audio URL provided');
    }



    try {
      const apiResponse = await downloadsApi.incrementDownloadCounter(lectureId);
      const downloadUrl = apiResponse.url || audioUrl;

      const partialFile = this.getPartialDownloadFile(lectureId);
      const resumableData = this.metadataCache.get(lectureId)?.resumableData;

      const progressCallback = (p: FileSystem.DownloadProgressData) => {
        onProgress({
          lectureId,
          progress: p.totalBytesWritten / p.totalBytesExpectedToWrite,
          bytesDownloaded: p.totalBytesWritten,
          totalBytes: p.totalBytesExpectedToWrite,
        });
      };

      const downloader = createDownloadResumable(
        downloadUrl,
        partialFile.uri,
        {},
        progressCallback,
        resumableData
      );

      const resumableDownload: ResumableDownload = { id: lectureId, downloader, episode, progressCallback };
      this.activeDownloads.set(lectureId, resumableDownload);
      return resumableDownload;

    } catch (error) {
      console.error(`Failed to create download for ${lectureId}:`, error);
      captureSentryException(error, { lectureId, audioUrl });
      throw error;
    }
  }

  async startDownload(download: ResumableDownload): Promise<void> {
    const { id: lectureId, downloader, episode } = download;
    try {
      const result = await downloader.downloadAsync();
      if (result) {
        const finalFile = this.getDownloadFile(lectureId);
        const partialFile = new File(this.downloadsDirectory, result.uri.split('/').pop()!);
        await partialFile.move(finalFile);

        const metadata: DownloadMetadata = {
          lectureId,
          title: episode.title,
          lecturerName: episode.lecturerName || 'Unknown',
          coverUrl: episode.coverUrl,
          audioUrl: episode.audioUrl,
          duration: episode.durationSec,
          downloadedAt: new Date().toISOString(),
          fileSize: result.size,
          resumableData: undefined,
        };
        this.metadataCache.set(lectureId, metadata);
        await this.saveMetadata();
        this.activeDownloads.delete(lectureId);
        this.notify();
      }
    } catch (error: any) {
      console.error(`Download failed for ${lectureId}:`, error);
      captureSentryException(error, { lectureId });
      if (error.userInfo?.resumableData) {
        this.saveResumableData(lectureId, error.userInfo.resumableData);
      }
      throw error;
    }
  }

  async pauseDownload(lectureId: string): Promise<void> {
    const download = this.activeDownloads.get(lectureId);
    if (download) {
      try {
        await download.downloader.pauseAsync();
        this.saveResumableData(lectureId, download.downloader.savable());
        console.log(`Paused download: ${lectureId}`);
      } catch (error) {
        console.error(`Failed to pause download ${lectureId}:`, error);
        captureSentryException(error, { lectureId });
      }
    }
  }

  async cancelDownload(lectureId: string): Promise<void> {
    const download = this.activeDownloads.get(lectureId);
    if (download) {
      try {
        await download.downloader.cancelAsync();
      } catch (error) {
        console.error(`Failed to cancel download ${lectureId}:`, error);
      }
      this.activeDownloads.delete(lectureId);
    }
    await this.deleteLecture(lectureId);
  }

  private async saveResumableData(lectureId: string, resumableData: any): Promise<void> {
    const metadata = this.metadataCache.get(lectureId) || { lectureId, downloadedAt: '' };
    const updatedMetadata = { ...metadata, resumableData: JSON.stringify(resumableData) };
    this.metadataCache.set(lectureId, updatedMetadata as DownloadMetadata);
    await this.saveMetadata();
  }

  getPlaybackUri(lectureId: string, remoteUrl?: string): string {
    const file = this.getDownloadFile(lectureId);
    if (file.exists) {
      return file.uri;
    }
    return remoteUrl || '';
  }

  async deleteLecture(lectureId: string): Promise<void> {
    await this.deleteFileIfExists(this.getDownloadFile(lectureId));
    await this.deleteFileIfExists(this.getPartialDownloadFile(lectureId));
    this.metadataCache.delete(lectureId);
    await this.saveMetadata();
    this.notify();
  }

  private async deleteFileIfExists(file: File): Promise<void> {
    if (file.exists) {
      await file.delete();
    }
  }

  getDownloadedLectures(): DownloadMetadata[] {
    return Array.from(this.metadataCache.values())
      .filter(m => this.isDownloaded(m.lectureId))
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
  }

  getDownloadMetadata(lectureId: string): DownloadMetadata | null {
    return this.metadataCache.get(lectureId) || null;
  }

  getTotalStorageUsed(): number {
    return Array.from(this.metadataCache.values()).reduce((acc, m) => acc + (m.fileSize || 0), 0);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  async clearAllDownloads(): Promise<void> {
    if(this.downloadsDirectory.exists) {
        await this.downloadsDirectory.delete();
    }
    await this.ensureDirExists();
    this.metadataCache.clear();
    await this.saveMetadata();
    this.notify();
  }
}

export const downloadsService = new DownloadsService();
