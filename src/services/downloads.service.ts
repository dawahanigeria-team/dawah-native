/**
 * Downloads Service - Phase 2: Resumable Downloads
 * Uses expo-file-system's DownloadResumable for pausable/resumable downloads.
 */

import AsyncStorage from "expo-sqlite/kv-store";
import { Directory, File, FileHandle, Paths } from "expo-file-system";

import { fetch } from "expo/fetch";
import type { Episode } from "../types/types";
import { logger } from "../utils/logger";
import { requestStoragePermission } from "../utils/permissions";
import { downloadsApi } from "./api/downloads.api";
import {
  addSentryBreadcrumb,
  captureSentryException,
} from "./config/sentry.config";

const DOWNLOADS_METADATA_KEY = "downloads_metadata";

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
  episode: Episode;
  progressCallback: (progress: DownloadProgress) => void;
  // New fields for manual pause/resume using streaming API
  abortController: AbortController;
  isPaused: boolean;
  bytesDownloaded: number;
  totalBytes: number;
}

export class DownloadError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
    public isPermissionError: boolean = false
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

class DownloadsService {
  private downloadsDirectory: Directory | null = null;
  private metadataCache: Map<string, DownloadMetadata> = new Map();
  private activeDownloads: Map<string, ResumableDownload> = new Map();
  private listeners: (() => void)[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Only initialize in React Native environment (not during bundling)
    if (typeof window !== "undefined") {
      // Create downloads directory in app's document storage
      this.downloadsDirectory = new Directory(Paths.document, "downloads");

      // Ensure downloads directory exists
      if (!this.downloadsDirectory.exists) {
        this.downloadsDirectory.create();
      }

      // Initialize metadata cache
      this.initPromise = this.loadMetadataCache();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Load download metadata from AsyncStorage
   */
  private async loadMetadataCache(): Promise<void> {
    try {
      logger.debug("📦 Downloads Service: Loading metadata from AsyncStorage...");
      const stored = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      if (stored) {
        const metadata: DownloadMetadata[] = JSON.parse(stored);
        metadata.forEach((item) => {
          this.metadataCache.set(item.lectureId, item);
        });
        logger.debug(`📦 Downloads Service: Loaded ${metadata.length} downloads from cache`);
      } else {
        logger.debug("📦 Downloads Service: No cached downloads found");
      }
    } catch (error) {
      logger.error("Failed to load downloads metadata", error as Error);
      this.isInitialized = true;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async saveMetadata(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const metadata = Array.from(this.metadataCache.values());
      await AsyncStorage.setItem(
        DOWNLOADS_METADATA_KEY,
        JSON.stringify(metadata)
      );
    } catch (error) {
      logger.error("Failed to save downloads metadata", error as Error);
    }
  }

  private getDownloadFile(lectureId: string): File {
    if (!this.downloadsDirectory) throw new Error("Downloads directory not initialized");
    return new File(this.downloadsDirectory, `${lectureId}.mp3`);
  }

  private getPartialDownloadFile(lectureId: string): File {
    if (!this.downloadsDirectory) throw new Error("Downloads directory not initialized");
    return new File(this.downloadsDirectory, `${lectureId}.part`);
  }

  isDownloaded(lectureId: string): boolean {
    if (!this.downloadsDirectory) return false;
    const file = this.getDownloadFile(lectureId);
    return file.exists && this.metadataCache.has(lectureId) && !this.metadataCache.get(lectureId)?.resumableData;
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
    const {
      id: lectureId,
      audioUrl,
      title,
      lecturerName,
      coverUrl,
      durationSec,
    } = episode;

    if (!this.downloadsDirectory) {
      throw new Error("Downloads directory not initialized");
    }

    if (!audioUrl) {
      throw new Error("No audio URL provided");
    }

    if (this.isDownloaded(lectureId)) {
      logger.debug(`Lecture ${lectureId} is already downloaded`);
      return;
    }

    const file = this.getDownloadFile(lectureId);
    if (!file) {
      throw new Error("Could not create download file");
    }

    // Declare variables for API response and download URL
    let apiResponse: any = null;
    let downloadUrl: string = audioUrl;

    try {
      // Check storage access (permissions are handled automatically for app-specific directories)
      // This is mainly for logging and ensuring the directory is accessible
      await requestStoragePermission();

      logger.debug(`📥 Starting download for: ${title}`);

      // Add breadcrumb for download tracking
      addSentryBreadcrumb(`Starting download: ${title}`, "download", {
        lectureId,
        title,
      });

      // STEP 1: Call backend API to increment download counter
      // This ensures download analytics are tracked on the server
      logger.debug(`📊 Incrementing download counter for lecture: ${lectureId}`);
      apiResponse = await downloadsApi.incrementDownloadCounter(lectureId);

      // Use the URL from API response (may have updated metadata)
      downloadUrl = apiResponse.url || audioUrl;
      logger.debug(`🔗 Download URL: ${downloadUrl}`);

      // STEP 2: Download the MP3 file to local storage using expo/fetch
      logger.debug(`📡 Fetching MP3 from: ${downloadUrl}`);
      const response = await fetch(downloadUrl);

      logger.debug(`📊 Download response: status=${response.status}, ok=${response.ok}`);

      if (!response.ok) {
        const errorMessage = `Download failed (${response.status}): ${response.statusText}`;
        logger.error(`❌ ${errorMessage}`, new Error(errorMessage), {
          url: downloadUrl,
          lectureId,
        });

        throw new Error(errorMessage);
      }

      // Get total size for progress tracking
      const contentLength = response.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      // Initialize download tracking
      let bytesDownloaded = 0;
      let lastProgressUpdate = 0;
      const PROGRESS_UPDATE_INTERVAL = 100; // Update progress every 100ms
      let fileHandle: FileHandle | null = null;

      logger.debug(
        `📊 Starting streaming download: ${totalBytes > 0 ? `${totalBytes} bytes total` : "unknown size"}`
      );

      // Get the response stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      try {
        try {
          // Ensure destination file exists and is truncated before writing
          file.create({ intermediates: true, overwrite: true });
          fileHandle = file.open();
        } catch (fileInitError) {
          throw new Error(
            `Unable to prepare download file: ${(fileInitError as Error).message || fileInitError
            }`
          );
        }

        // Read the stream in chunks
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (!value || !fileHandle) {
            continue;
          }

          // Stream chunk directly to disk
          fileHandle.writeBytes(value);

          // Update progress tracking
          bytesDownloaded += value.length;

          // Throttle progress updates to avoid too frequent callbacks
          const now = Date.now();
          if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
            const progress = totalBytes > 0 ? bytesDownloaded / totalBytes : 0;

            if (onProgress) {
              onProgress({
                lectureId,
                progress: Math.min(progress, 0.99), // Don't report 100% until actually done
                bytesDownloaded,
                totalBytes: totalBytes > 0 ? totalBytes : bytesDownloaded, // Use downloaded as total if unknown
              });
            }

            lastProgressUpdate = now;
          }
        }

        logger.debug(
          `✅ Download complete: ${title} (${bytesDownloaded} bytes saved to local storage)`
        );

        // Report final completion
        if (onProgress) {
          onProgress({
            lectureId,
            progress: 1,
            bytesDownloaded,
            totalBytes: bytesDownloaded,
          });
        }
      } finally {
        // Always close the reader and file handle
        try {
          reader.releaseLock();
        } catch (releaseError) {
          console.warn('Failed to release download reader lock', releaseError);
        }
        if (fileHandle) {
          try {
            fileHandle.close();
          } catch (closeError) {
            console.warn('Failed to close download file handle', closeError);
          }
        }
      }

      // Save metadata
      const metadata: DownloadMetadata = {
        lectureId,
        title,
        lecturerName: lecturerName || "Unknown",
        coverUrl,
        audioUrl: downloadUrl || audioUrl || undefined,
        duration: durationSec,
        downloadedAt: new Date().toISOString(),
        fileSize: bytesDownloaded,
      };

      this.metadataCache.set(lectureId, metadata);
      await this.saveMetadata();

      // Also save metadata as JSON file for reference
      const metadataFile = this.getMetadataFile(lectureId);
      if (metadataFile) {
        await metadataFile.write(JSON.stringify(metadata, null, 2));
      }
    } catch (error: any) {
      logger.error(`Failed to download lecture ${lectureId}`, error as Error);

      // Clean up partial download file if it exists
      try {
        if (file && file.exists) {
          await file.delete();
        }
      } catch (cleanupError) {
        logger.warn("Failed to clean up partial download:", cleanupError);
      }

      // Determine if this is a permission-related error
      const errorMessage = error?.message || String(error);
      const isPermissionError =
        errorMessage.includes("permission") ||
        errorMessage.includes("Permission") ||
        errorMessage.includes("Storage permission") ||
        errorMessage.includes("storage permissions") ||
        errorMessage.includes("EACCES") ||
        errorMessage.includes("access denied");

      // Create user-friendly error message
      let userFriendlyMessage = errorMessage;
      if (isPermissionError) {
        userFriendlyMessage =
          "Storage permission is required to download lectures. Please enable storage permission in your device settings and try again.";
      } else if (errorMessage.includes("Network") || errorMessage.includes("fetch")) {
        userFriendlyMessage =
          "Unable to download lecture. Please check your internet connection and try again.";
      } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        userFriendlyMessage =
          "Lecture file not found. Please try again later or contact support if the issue persists.";
      } else {
        userFriendlyMessage =
          errorMessage || "Failed to download lecture. Please try again.";
      }

      // Report download errors to Sentry with full context
      captureSentryException(error, {
        lectureId,
        title,
        lecturerName,
        originalAudioUrl: audioUrl,
        apiResponseUrl: apiResponse?.url,
        attemptedDownloadUrl: downloadUrl,
        apiResponse: apiResponse ? JSON.stringify(apiResponse) : "null",
        errorType: isPermissionError ? "permission_error" : "download_failed",
        errorMessage: error.message,
        isPermissionError,
      });

      // Throw error with user-friendly message
      // Throw error with user-friendly message
      throw new DownloadError(
        userFriendlyMessage,
        isPermissionError ? 'PERMISSION_DENIED' : 'DOWNLOAD_FAILED',
        error,
        isPermissionError
      );
    }
  }

  private getMetadataFile(lectureId: string): File {
    if (!this.downloadsDirectory) throw new Error("Downloads directory not initialized");
    return new File(this.downloadsDirectory, `${lectureId}.json`);
  }

  private async saveResumableData(lectureId: string, resumableData: any): Promise<void> {
    const metadata = this.metadataCache.get(lectureId) || { lectureId, downloadedAt: '' };
    const updatedMetadata = { ...metadata, resumableData: JSON.stringify(resumableData) };
    this.metadataCache.set(lectureId, updatedMetadata as DownloadMetadata);
    await this.saveMetadata();
  }

  getPlaybackUri(lectureId: string, remoteUrl?: string): string {
    if (this.downloadsDirectory) {
      const file = this.getDownloadFile(lectureId);
      if (file.exists) {
        return file.uri;
      }
    }

    // Return remote URL for online playback
    return remoteUrl || "";
  }

  async deleteLecture(lectureId: string): Promise<void> {
    if (!this.downloadsDirectory) return;
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
    if (!this.downloadsDirectory) return [];
    const allMetadata = Array.from(this.metadataCache.values());

    // Filter to only include lectures with existing files
    const validDownloads = allMetadata.filter((metadata) => {
      const file = this.getDownloadFile(metadata.lectureId);
      return file && file.exists;
    });

    // Sort by download date (newest first)
    return validDownloads.sort(
      (a, b) =>
        new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  }

  getDownloadMetadata(lectureId: string): DownloadMetadata | null {
    return this.metadataCache.get(lectureId) || null;
  }

  getTotalStorageUsed(): number {
    let total = 0;
    this.metadataCache.forEach((metadata) => {
      total += metadata.fileSize || 0;
    });
    return total;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  async clearAllDownloads(): Promise<void> {
    if (!this.downloadsDirectory) {
      logger.warn("Cannot clear downloads: directory not initialized");
      return;
    }

    // Delete all files in downloads directory
    const items = this.downloadsDirectory.list();
    for (const item of items) {
      if (item instanceof File) {
        item.delete();
      }
    }

    this.metadataCache.clear();
    await this.saveMetadata();
    this.notify();

    logger.debug("Cleared all downloads");
  }

  /**
   * Create a resumable download for an episode
   */
  async createDownload(
    episode: Episode,
    progressCallback: (progress: DownloadProgress) => void
  ): Promise<ResumableDownload | null> {
    const { id: lectureId, audioUrl, title } = episode;

    if (!audioUrl) {
      logger.error("No audio URL provided for episode", new Error("Missing audio URL"), { lectureId });
      return null;
    }

    try {
      const resumableDownload: ResumableDownload = {
        id: lectureId,
        episode,
        progressCallback,
        abortController: new AbortController(),
        isPaused: false,
        bytesDownloaded: 0,
        totalBytes: 0,
      };

      this.activeDownloads.set(lectureId, resumableDownload);
      return resumableDownload;
    } catch (error) {
      logger.error("Failed to create resumable download", error as Error);
      captureSentryException(error as Error, {
        operation: "create_resumable_download",
        lectureId,
        title,
      });
      return null;
    }
  }

  /**
   * Start a resumable download
   */
  async startDownload(resumableDownload: ResumableDownload): Promise<void> {
    const { id, episode, progressCallback, abortController } = resumableDownload;
    const file = this.getPartialDownloadFile(id);
    let fileHandle: FileHandle | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      // Check for existing partial file to resume
      let existingSize = 0;
      if (file.exists) {
        // Try to get file size using type-safe approach
        // expo-file-system File objects in SDK 54 have a size property
        try {
          // Type guard to safely access size property
          const fileInfo = file as { size?: number };
          if (typeof fileInfo.size === 'number' && fileInfo.size > 0) {
            existingSize = fileInfo.size;
          } else {
            // Size property not available or zero, restart the download
            logger.warn('File size property not available, restarting download from scratch');
            file.delete();
            existingSize = 0;
          }
        } catch (e) {
          logger.warn('Could not get file size, restarting download:', e);
          file.delete();
          existingSize = 0;
        }
      }

      const headers: Record<string, string> = {};
      if (existingSize > 0) {
        headers['Range'] = `bytes=${existingSize}-`;
        logger.debug(`Resuming download for ${id} from byte ${existingSize}`);
      }

      logger.debug(`Fetching download: ${episode.audioUrl}`);

      const response = await fetch(episode.audioUrl!, {
        signal: abortController.signal,
        headers,
      });

      if (!response.ok) {
        // If Range request fails (e.g. 416 Range Not Satisfiable), restart from scratch
        if (response.status === 416) {
          logger.warn('Range request failed (416), cleaning up and restarting download');

          // Clean up partial file
          if (file.exists) {
            file.delete();
          }

          // Reset resumable download state completely
          resumableDownload.bytesDownloaded = 0;
          resumableDownload.totalBytes = 0;
          resumableDownload.isPaused = false;

          // Create fresh abort controller
          resumableDownload.abortController = new AbortController();

          // Retry download from beginning
          return this.startDownload(resumableDownload);
        }

        // Provide user-friendly error messages for common HTTP errors
        let errorMessage: string;
        switch (response.status) {
          case 404:
            errorMessage = 'Audio file not found on server. This lecture may have been removed or the link is broken.';
            break;
          case 403:
            errorMessage = 'Access denied. You may not have permission to download this lecture.';
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = `Download failed with status ${response.status}. Please try again.`;
        }

        logger.error('Download failed', new Error(`${errorMessage} (HTTP ${response.status})`), {
          lectureId: id,
          audioUrl: episode.audioUrl,
          status: response.status,
        });

        throw new Error(errorMessage);
      }

      const contentLength = response.headers.get("content-length");
      // If 206 Partial Content, total length is content-length + existing size
      // Note: Content-Range header usually has the full size: "bytes 100-200/200"
      const totalBytesHeader = response.headers.get("content-range")?.split('/')[1];
      const totalBytes = totalBytesHeader
        ? parseInt(totalBytesHeader, 10)
        : (contentLength ? parseInt(contentLength, 10) + existingSize : 0);

      resumableDownload.totalBytes = totalBytes;

      // Stream to file
      if (response.status === 206 && existingSize > 0) {
        // Resuming: File already exists, just open it and set offset
        // Don't call create() because the file already exists
        if (!file.exists) {
          // This shouldn't happen, but handle it gracefully
          logger.warn('Resume requested but file does not exist, restarting download');
          resumableDownload.bytesDownloaded = 0;
          resumableDownload.totalBytes = 0;
          resumableDownload.abortController = new AbortController();
          return this.startDownload(resumableDownload);
        }

        // Open existing file for writing
        fileHandle = file.open();

        // Set offset to the end of the partial file to append new data
        // In Expo SDK 54, FileHandle has an 'offset' property that controls write position
        try {
          // Type-safe approach to set offset property
          const handleWithOffset = fileHandle as { offset?: number };
          if ('offset' in handleWithOffset) {
            handleWithOffset.offset = existingSize;
            logger.debug(`Set file offset to ${existingSize} for resume`);
          } else {
            // offset property not supported, restart download
            throw new Error('FileHandle offset property not supported');
          }
        } catch (e) {
          // If setting offset fails, cannot resume - restart download
          logger.error('Failed to set file offset, restarting download', e as Error);
          if (fileHandle) {
            fileHandle.close();
            fileHandle = null;
          }
          file.delete();

          // Reset state and retry from beginning
          resumableDownload.bytesDownloaded = 0;
          resumableDownload.totalBytes = 0;
          resumableDownload.abortController = new AbortController();
          return this.startDownload(resumableDownload);
        }
      } else {
        // New download or server didn't accept range: Overwrite
        file.create({ intermediates: true, overwrite: true });
        fileHandle = file.open();
        existingSize = 0; // Reset if we are overwriting
      }

      reader = response.body?.getReader() || null;

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let bytesDownloaded = existingSize;
      let lastProgressUpdate = 0;
      const PROGRESS_UPDATE_INTERVAL = 100; // Update progress every 100ms

      // Update initial state
      resumableDownload.bytesDownloaded = bytesDownloaded;

      while (true) {
        // Check if paused
        if (resumableDownload.isPaused) {
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value && fileHandle) {
          fileHandle.writeBytes(value);
          bytesDownloaded += value.length;
          resumableDownload.bytesDownloaded = bytesDownloaded;

          // Throttle progress updates
          const now = Date.now();
          if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
            const rawProgress = totalBytes > 0 ? bytesDownloaded / totalBytes : 0;
            progressCallback({
              lectureId: id,
              progress: Math.min(rawProgress, 1),
              bytesDownloaded,
              totalBytes: totalBytes || bytesDownloaded,
            });
            lastProgressUpdate = now;
          }
        }
      }

      // If completed successfully, move to final location
      if (!resumableDownload.isPaused && (totalBytes === 0 || bytesDownloaded === totalBytes)) {
        const finalFile = this.getDownloadFile(id);

        // Copy to final location
        file.copy(finalFile);
        file.delete();

        // Save metadata
        const metadata: DownloadMetadata = {
          lectureId: id,
          title: episode.title,
          lecturerName: episode.lecturerName || "Unknown",
          coverUrl: episode.coverUrl,
          audioUrl: episode.audioUrl || undefined,
          duration: episode.durationSec,
          downloadedAt: new Date().toISOString(),
          fileSize: bytesDownloaded,
        };

        this.metadataCache.set(id, metadata);
        await this.saveMetadata();
        this.activeDownloads.delete(id);
        this.notify();

        // Report final completion
        progressCallback({
          lectureId: id,
          progress: 1,
          bytesDownloaded,
          totalBytes: bytesDownloaded,
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        logger.debug("Download was cancelled");
      } else {
        logger.error("Download failed", error);
        throw error;
      }
    } finally {
      // ALWAYS clean up resources
      if (reader) {
        try {
          reader.releaseLock();
        } catch (releaseError) {
          logger.warn('Failed to release reader lock:', releaseError);
        }
      }
      if (fileHandle) {
        try {
          fileHandle.close();
        } catch (closeError) {
          logger.warn('Failed to close file handle:', closeError);
        }
      }
    }
  }

  /**
   * Pause a resumable download
   */
  async pauseDownload(lectureId: string): Promise<void> {
    const download = this.activeDownloads.get(lectureId);
    if (download) {
      try {
        download.isPaused = true;
        // Save resumable state
        const metadata = this.metadataCache.get(lectureId) || {
          lectureId,
          title: download.episode.title,
          lecturerName: download.episode.lecturerName || "Unknown",
          duration: download.episode.durationSec,
          downloadedAt: new Date().toISOString(),
        };
        this.metadataCache.set(lectureId, {
          ...metadata,
          resumableData: JSON.stringify({
            bytesDownloaded: download.bytesDownloaded,
            totalBytes: download.totalBytes,
          }),
        } as DownloadMetadata);
        await this.saveMetadata();
        this.notify();
      } catch (error) {
        logger.error("Failed to pause download", error as Error);
        captureSentryException(error as Error, {
          operation: "pause_download",
          lectureId,
        });
      }
    }
  }

  /**
   * Cancel a download and clean up
   */
  async cancelDownload(lectureId: string): Promise<void> {
    const download = this.activeDownloads.get(lectureId);
    if (download) {
      try {
        download.abortController.abort();
      } catch (error) {
        logger.warn("Error aborting download:", error);
      }
      this.activeDownloads.delete(lectureId);
    }

    // Clean up partial files
    await this.deleteFileIfExists(this.getPartialDownloadFile(lectureId));
    this.metadataCache.delete(lectureId);
    await this.saveMetadata();
    this.notify();
  }
}

export const downloadsService = new DownloadsService();
