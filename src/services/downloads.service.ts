/**
 * Downloads Service - Phase 1: Basic Download
 * Uses new expo-file-system SDK 54 API with File/Directory classes
 */

import { fetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Episode } from '../types/types';
import { downloadsApi } from './api/downloads.api';
import { captureSentryException, addSentryBreadcrumb } from './config/sentry.config';

const DOWNLOADS_METADATA_KEY = 'downloads_metadata';

export interface DownloadMetadata {
  lectureId: string;
  title: string;
  lecturerName: string;
  coverUrl?: string;
  audioUrl?: string; // Store original remote URL as fallback
  duration: number;
  downloadedAt: string;
  fileSize?: number;
}

export interface DownloadProgress {
  lectureId: string;
  progress: number; // 0-1
  bytesDownloaded: number;
  totalBytes: number;
}

class DownloadsService {
  private downloadsDirectory!: Directory;
  private metadataCache: Map<string, DownloadMetadata> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Only initialize in React Native environment (not during bundling)
    if (typeof window !== 'undefined') {
      // Create downloads directory in app's document storage
      this.downloadsDirectory = new Directory(Paths.document, 'downloads');

      // Ensure downloads directory exists
      if (!this.downloadsDirectory.exists) {
        this.downloadsDirectory.create();
      }

      // Start loading metadata cache
      this.initPromise = this.loadMetadataCache();
    } else {
      // During bundling/export, mark as initialized to avoid errors
      this.isInitialized = true;
    }
  }

  /**
   * Load download metadata from AsyncStorage
   */
  private async loadMetadataCache(): Promise<void> {
    if (typeof window === 'undefined') {
      this.isInitialized = true;
      return;
    }

    try {
      console.log('📦 Downloads Service: Loading metadata from AsyncStorage...');
      const stored = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      if (stored) {
        const metadata: DownloadMetadata[] = JSON.parse(stored);
        metadata.forEach(item => {
          this.metadataCache.set(item.lectureId, item);
        });
        console.log(`📦 Downloads Service: Loaded ${metadata.length} downloads from cache`);
      } else {
        console.log('📦 Downloads Service: No cached downloads found');
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load downloads metadata:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Ensure the service is initialized before using
   */
  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Save metadata to AsyncStorage
   */
  private async saveMetadata(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const metadata = Array.from(this.metadataCache.values());
      await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save downloads metadata:', error);
    }
  }

  /**
   * Get the file path for a downloaded lecture
   */
  private getDownloadFile(lectureId: string): File | null {
    if (!this.downloadsDirectory) return null;
    return new File(this.downloadsDirectory, `${lectureId}.mp3`);
  }

  /**
   * Get the metadata file for a lecture
   */
  private getMetadataFile(lectureId: string): File | null {
    if (!this.downloadsDirectory) return null;
    return new File(this.downloadsDirectory, `${lectureId}.json`);
  }

  /**
   * Check if a lecture is downloaded
   */
  isDownloaded(lectureId: string): boolean {
    const file = this.getDownloadFile(lectureId);
    return file ? file.exists : false;
  }

  /**
   * Download a lecture
   *
   * Two-step process:
   * 1. Call backend API (download_api.php) to increment download counter
   * 2. Download the actual MP3 file to local storage
   *
   * This ensures the backend tracks download analytics correctly.
   */
  async downloadLecture(
    episode: Episode,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const { id: lectureId, audioUrl, title, lecturerName, coverUrl, durationSec } = episode;

    if (!this.downloadsDirectory) {
      throw new Error('Downloads directory not initialized');
    }

    if (!audioUrl) {
      throw new Error('No audio URL provided');
    }

    if (this.isDownloaded(lectureId)) {
      console.log(`Lecture ${lectureId} is already downloaded`);
      return;
    }

    const file = this.getDownloadFile(lectureId);
    if (!file) {
      throw new Error('Could not create download file');
    }

    // Declare variables at function scope for error handling
    let apiResponse: any = null;
    let downloadUrl: string = audioUrl;

    try {
      console.log(`📥 Starting download for: ${title}`);

      // Add breadcrumb for download tracking
      addSentryBreadcrumb(
        `Starting download: ${title}`,
        'download',
        { lectureId, title }
      );

      // STEP 1: Call backend API to increment download counter
      // This ensures download analytics are tracked on the server
      console.log(`📊 Incrementing download counter for lecture: ${lectureId}`);
      apiResponse = await downloadsApi.incrementDownloadCounter(lectureId);

      // Use the URL from API response (may have updated metadata)
      downloadUrl = apiResponse.url || audioUrl;
      console.log(`🔗 Download URL: ${downloadUrl}`);

      // STEP 2: Download the MP3 file to local storage using expo/fetch
      console.log(`📡 Fetching MP3 from: ${downloadUrl}`);
      const response = await fetch(downloadUrl);

      console.log(`📊 Download response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        }
      });

      if (!response.ok) {
        const errorMessage = `Download failed (${response.status}): ${response.statusText}`;
        console.error(`❌ ${errorMessage}`);
        console.error(`   URL attempted: ${downloadUrl}`);
        console.error(`   Lecture ID: ${lectureId}`);

        throw new Error(errorMessage);
      }

      // Get total size for progress tracking
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      // Read response as bytes and write to file
      const bytes = await response.bytes();

      // Write the file (uses new SDK 54 API - no base64!)
      await file.write(bytes);

      console.log(`✅ Download complete: ${title} (${bytes.length} bytes saved to local storage)`);

      // Report completion
      if (onProgress) {
        onProgress({
          lectureId,
          progress: 1,
          bytesDownloaded: bytes.length,
          totalBytes: bytes.length,
        });
      }

      // Save metadata
      const metadata: DownloadMetadata = {
        lectureId,
        title,
        lecturerName: lecturerName || 'Unknown',
        coverUrl,
        audioUrl: downloadUrl || '', // Store original URL as fallback, default to empty string
        duration: durationSec,
        downloadedAt: new Date().toISOString(),
        fileSize: bytes.length,
      };

      this.metadataCache.set(lectureId, metadata);
      await this.saveMetadata();

      // Also save metadata as JSON file for reference
      const metadataFile = this.getMetadataFile(lectureId);
      if (metadataFile) {
        await metadataFile.write(JSON.stringify(metadata, null, 2));
      }

    } catch (error: any) {
      console.error(`Failed to download lecture ${lectureId}:`, error);

      // Report download errors to Sentry with full context
      captureSentryException(error, {
        lectureId,
        title,
        lecturerName,
        originalAudioUrl: audioUrl,
        apiResponseUrl: apiResponse?.url,
        attemptedDownloadUrl: downloadUrl,
        apiResponse: apiResponse ? JSON.stringify(apiResponse) : 'null',
        errorType: 'download_failed',
        errorMessage: error.message,
      });

      // Clean up partial download
      if (file.exists) {
        file.delete();
      }

      throw error;
    }
  }

  /**
   * Get the local file URI for playback
   * Returns the downloaded file if available, otherwise returns the remote URL
   */
  getPlaybackUri(lectureId: string, remoteUrl?: string): string {
    const file = this.getDownloadFile(lectureId);

    if (file && file.exists) {
      // Return the local file URI for offline playback
      return file.uri;
    }

    // Return remote URL for online playback
    return remoteUrl || '';
  }

  /**
   * Delete a downloaded lecture
   */
  async deleteLecture(lectureId: string): Promise<void> {
    const file = this.getDownloadFile(lectureId);
    const metadataFile = this.getMetadataFile(lectureId);

    if (file && file.exists) {
      file.delete();
    }

    if (metadataFile && metadataFile.exists) {
      metadataFile.delete();
    }

    this.metadataCache.delete(lectureId);
    await this.saveMetadata();

    console.log(`Deleted download: ${lectureId}`);
  }

  /**
   * Get all downloaded lectures
   * Only returns lectures whose files actually exist
   */
  getDownloadedLectures(): DownloadMetadata[] {
    const allMetadata = Array.from(this.metadataCache.values());

    // Filter to only include lectures with existing files
    const validDownloads = allMetadata.filter(metadata => {
      const file = this.getDownloadFile(metadata.lectureId);
      return file && file.exists;
    });

    // Sort by download date (newest first)
    return validDownloads.sort((a, b) =>
      new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  }

  /**
   * Get download metadata for a specific lecture
   */
  getDownloadMetadata(lectureId: string): DownloadMetadata | null {
    return this.metadataCache.get(lectureId) || null;
  }

  /**
   * Get total storage used by downloads
   */
  getTotalStorageUsed(): number {
    let total = 0;
    this.metadataCache.forEach(metadata => {
      total += metadata.fileSize || 0;
    });
    return total;
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clear all downloads
   */
  async clearAllDownloads(): Promise<void> {
    if (!this.downloadsDirectory) {
      console.warn('Cannot clear downloads: directory not initialized');
      return;
    }

    const items = this.downloadsDirectory.list();

    for (const item of items) {
      if (item instanceof File) {
        item.delete();
      }
    }

    this.metadataCache.clear();
    await this.saveMetadata();

    console.log('Cleared all downloads');
  }
}

// Export singleton instance
export const downloadsService = new DownloadsService();
