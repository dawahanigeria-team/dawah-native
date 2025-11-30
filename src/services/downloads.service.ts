/**
 * Downloads Service - Phase 2: Resumable Downloads
 * Uses expo-file-system's DownloadResumable for pausable/resumable downloads.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, FileHandle, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system";
import { fetch } from "expo/fetch";
import type { Episode } from "../types/types";
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
      console.log(
        "📦 Downloads Service: Loading metadata from AsyncStorage..."
      );
      const stored = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      if (stored) {
        const metadata: DownloadMetadata[] = JSON.parse(stored);
        metadata.forEach((item) => {
          this.metadataCache.set(item.lectureId, item);
        });
        console.log(
          `📦 Downloads Service: Loaded ${metadata.length} downloads from cache`
        );
      } else {
        console.log("📦 Downloads Service: No cached downloads found");
      }
    } catch (error) {
      console.error("Failed to load downloads metadata:", error);
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
      console.error("Failed to save downloads metadata:", error);
    }
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
      console.log(`Lecture ${lectureId} is already downloaded`);
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

      console.log(`📥 Starting download for: ${title}`);

      // Add breadcrumb for download tracking
      addSentryBreadcrumb(`Starting download: ${title}`, "download", {
        lectureId,
        title,
      });

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
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
        },
      });

      if (!response.ok) {
        const errorMessage = `Download failed (${response.status}): ${response.statusText}`;
        console.error(`❌ ${errorMessage}`);
        console.error(`   URL attempted: ${downloadUrl}`);
        console.error(`   Lecture ID: ${lectureId}`);

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

      console.log(
        `📊 Starting streaming download: ${
          totalBytes > 0 ? `${totalBytes} bytes total` : "unknown size"
        }`
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
            `Unable to prepare download file: ${
              (fileInitError as Error).message || fileInitError
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

        console.log(
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
        audioUrl: downloadUrl || "", // Store original URL as fallback, default to empty string
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
      console.error(`Failed to download lecture ${lectureId}:`, error);

      // Clean up partial download file if it exists
      try {
        if (file && file.exists) {
          await file.delete();
        }
      } catch (cleanupError) {
        console.warn("Failed to clean up partial download:", cleanupError);
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
      const friendlyError = new Error(userFriendlyMessage);
      (friendlyError as any).originalError = error;
      (friendlyError as any).isPermissionError = isPermissionError;
      throw friendlyError;
    }
  }

  private getMetadataFile(lectureId: string): File {
    return new File(this.downloadsDirectory, `${lectureId}.json`);
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

    // Return remote URL for online playback
    return remoteUrl || "";
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
      console.warn("Cannot clear downloads: directory not initialized");
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

    console.log("Cleared all downloads");
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
      console.error("No audio URL provided for episode:", lectureId);
      return null;
    }

    try {
      const file = this.getPartialDownloadFile(lectureId);
      const callback = (downloadProgress: {
        totalBytesWritten: number;
        totalBytesExpectedToWrite: number;
      }) => {
        progressCallback({
          lectureId,
          progress: downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite,
          bytesDownloaded: downloadProgress.totalBytesWritten,
          totalBytes: downloadProgress.totalBytesExpectedToWrite,
        });
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        file.uri,
        {},
        callback
      );

      const resumableDownload: ResumableDownload = {
        id: lectureId,
        downloader: downloadResumable,
        episode,
        progressCallback,
      };

      this.activeDownloads.set(lectureId, resumableDownload);
      return resumableDownload;
    } catch (error) {
      console.error("Failed to create resumable download:", error);
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
    try {
      const result = await resumableDownload.downloader.downloadAsync();

      if (result) {
        // Move from .part to final .mp3 file
        const partFile = this.getPartialDownloadFile(resumableDownload.id);
        const finalFile = this.getDownloadFile(resumableDownload.id);

        // Copy content from part file to final file using FileSystem API
        if (partFile.exists) {
          await FileSystem.copyAsync({
            from: partFile.uri,
            to: finalFile.uri,
          });
          partFile.delete();
        }

        // Save metadata
        const metadata: DownloadMetadata = {
          lectureId: resumableDownload.id,
          title: resumableDownload.episode.title,
          lecturerName: resumableDownload.episode.lecturerName || "Unknown",
          coverUrl: resumableDownload.episode.coverUrl,
          audioUrl: resumableDownload.episode.audioUrl,
          duration: resumableDownload.episode.durationSec,
          downloadedAt: new Date().toISOString(),
          fileSize: result.headers["Content-Length"] ? parseInt(result.headers["Content-Length"]) : undefined,
        };

        this.metadataCache.set(resumableDownload.id, metadata);
        await this.saveMetadata();
        this.activeDownloads.delete(resumableDownload.id);
        this.notify();
      }
    } catch (error) {
      console.error("Download failed:", error);
      throw error;
    }
  }

  /**
   * Pause a resumable download
   */
  async pauseDownload(lectureId: string): Promise<void> {
    const download = this.activeDownloads.get(lectureId);
    if (download) {
      try {
        const resumableData = await download.downloader.pauseAsync();
        await this.saveResumableData(lectureId, resumableData);
        this.notify();
      } catch (error) {
        console.error("Failed to pause download:", error);
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
        await download.downloader.pauseAsync();
      } catch (error) {
        console.warn("Error pausing download before cancel:", error);
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
