/**
 * Downloads Service - Phase 2: Resumable Downloads
 * Uses expo-file-system's DownloadResumable for pausable/resumable downloads.
 */

import AsyncStorage from "expo-sqlite/kv-store";
import { Directory, File, Paths } from "expo-file-system";
import {
  createDownloadResumable,
  moveAsync,
  type DownloadPauseState,
  type DownloadProgressData as LegacyDownloadProgressData,
  type DownloadResumable as LegacyDownloadResumable,
} from "expo-file-system/legacy";
import type { Episode } from "../types/types";
import { logger } from "../utils/logger";
import { requestStoragePermission } from "../utils/permissions";
import { encodeMediaUrl } from "../utils/mediaUrl";
import {
  downloadsApi,
  DownloadAuthRequiredError,
  DownloadLimitReachedError,
} from "./api/downloads.api";
import {
  addSentryBreadcrumb,
  captureSentryException,
} from "./config/sentry.config";
import {
  DownloadFailedError,
  downloadFailureContext,
} from "./downloads/downloadFailureReporting";

/**
 * A refusal the server made on purpose - not signed in, or the free
 * monthly allowance is spent. These carry a message written for the user
 * and must reach the caller with their type intact, so the UI can offer
 * sign-in or the upsell instead of "try again", and so Sentry is not told
 * about an outcome the product intends.
 */
export function isExpectedDownloadRefusal(error: unknown): boolean {
  return (
    error instanceof DownloadAuthRequiredError ||
    error instanceof DownloadLimitReachedError
  );
}

const DOWNLOADS_METADATA_KEY = "downloads_metadata";

type PersistedResumableData = {
  pauseState: DownloadPauseState;
  bytesDownloaded: number;
  totalBytes: number;
};

type DownloadRunResult = "completed" | "paused" | "cancelled";

const isCancelledDownloadError = (error: unknown): boolean => {
  const maybeError = error as { name?: string; message?: string; code?: string } | null;
  if (!maybeError) return false;

  const name = (maybeError.name || "").toLowerCase();
  const message = (maybeError.message || "").toLowerCase();
  const code = (maybeError.code || "").toLowerCase();

  if (name === "aborterror" || code === "err_canceled") {
    return true;
  }

  return (
    message.includes("fetch request has been canceled") ||
    message.includes("request cancelled") ||
    message.includes("request canceled") ||
    message.includes("aborted") ||
    message.includes("canceled") ||
    message.includes("cancelled")
  );
};

/**
 * Shown to the user when a download reported success but its partial file was
 * gone by the time we went to save it - the OS reclaiming storage, or a
 * concurrent cancel. The queue surfaces this string directly.
 */
const DOWNLOAD_FILE_MISSING_MESSAGE =
  "The download could not be saved. Please check your available storage and try again.";

const getDownloadStatusErrorMessage = (status: number): string => {
  switch (status) {
    case 404:
      return "Audio file not found on server. This lecture may have been removed or the link is broken.";
    case 403:
      return "Access denied. You may not have permission to download this lecture.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Server error. Please try again later.";
    default:
      return `Download failed with status ${status}. Please try again.`;
  }
};

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
  downloadUrl: string;
  progressCallback: (progress: DownloadProgress) => void;
  isPaused: boolean;
  isCancelled?: boolean;
  bytesDownloaded: number;
  totalBytes: number;
  downloadTask: LegacyDownloadResumable | null;
  resumeState: DownloadPauseState | null;
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
      try {
        // Create downloads directory in app's document storage
        this.downloadsDirectory = new Directory(Paths.document, "downloads");

        // Ensure downloads directory exists
        if (!this.downloadsDirectory.exists) {
          this.downloadsDirectory.create();
        }
      } catch (error) {
        logger.error("Failed to create downloads directory", error as Error);
        this.downloadsDirectory = null;
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
    } finally {
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

  private getFileSize(file: File): number {
    return typeof file.size === "number" && file.size > 0 ? file.size : 0;
  }

  private parsePersistedResumableData(serialized: string | undefined): PersistedResumableData | null {
    if (!serialized) {
      return null;
    }

    try {
      const parsed = JSON.parse(serialized) as Partial<PersistedResumableData> | null;
      if (!parsed?.pauseState?.fileUri || !parsed.pauseState.url) {
        return null;
      }

      return {
        pauseState: parsed.pauseState,
        bytesDownloaded: typeof parsed.bytesDownloaded === "number" ? parsed.bytesDownloaded : 0,
        totalBytes: typeof parsed.totalBytes === "number" ? parsed.totalBytes : 0,
      };
    } catch (error) {
      logger.warn("Failed to parse persisted resumable data", error);
      return null;
    }
  }

  private createLegacyProgressCallback(
    lectureId: string,
    onProgress?: (progress: DownloadProgress) => void,
    onStateUpdate?: (progress: DownloadProgress) => void
  ) {
    return (progressData: LegacyDownloadProgressData) => {
      const bytesDownloaded = progressData.totalBytesWritten;
      const reportedTotal = progressData.totalBytesExpectedToWrite;
      const totalBytes = reportedTotal > 0 ? reportedTotal : bytesDownloaded;
      const progress = totalBytes > 0 ? bytesDownloaded / totalBytes : 0;
      const nextProgress: DownloadProgress = {
        lectureId,
        progress: Math.min(progress, 0.99),
        bytesDownloaded,
        totalBytes,
      };

      onStateUpdate?.(nextProgress);
      onProgress?.(nextProgress);
    };
  }

  private createResumableTask(
    lectureId: string,
    downloadUrl: string,
    targetFileUri: string,
    onProgress?: (progress: DownloadProgress) => void,
    onStateUpdate?: (progress: DownloadProgress) => void,
    resumeState?: DownloadPauseState | null
  ): LegacyDownloadResumable {
    return createDownloadResumable(
      encodeMediaUrl(downloadUrl),
      targetFileUri,
      {},
      this.createLegacyProgressCallback(lectureId, onProgress, onStateUpdate),
      resumeState?.resumeData
    );
  }

  private async resolveDownloadUrl(lectureId: string, audioUrl: string): Promise<string> {
    const apiResponse = await downloadsApi.incrementDownloadCounter(lectureId);
    return apiResponse.url || audioUrl;
  }

  private async runLegacyDownloadTask(
    task: LegacyDownloadResumable,
    resumeState: DownloadPauseState | null
  ) {
    return resumeState?.resumeData ? task.resumeAsync() : task.downloadAsync();
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

      // STEP 2: Download the MP3 file to local storage using Expo's native download task.
      logger.debug(`📡 Downloading MP3 from: ${downloadUrl}`);

      let bytesDownloaded = 0;
      let totalBytes = 0;
      const downloadTask = createDownloadResumable(
        encodeMediaUrl(downloadUrl),
        file.uri,
        {},
        this.createLegacyProgressCallback(lectureId, onProgress, (progress) => {
          bytesDownloaded = progress.bytesDownloaded;
          totalBytes = progress.totalBytes;
        })
      );

      const result = await downloadTask.downloadAsync();

      if (!result) {
        throw new Error("Download was cancelled before completion");
      }

      logger.debug(`📊 Download response: status=${result.status}`);

      if (result.status < 200 || result.status >= 300) {
        const errorMessage = getDownloadStatusErrorMessage(result.status);
        const failureContext = {
          url: downloadUrl,
          lectureId,
          status: result.status,
        };

        logger.warn(`Download failed: ${errorMessage}`, failureContext);

        throw new DownloadFailedError(errorMessage, failureContext);
      }

      bytesDownloaded = Math.max(bytesDownloaded, this.getFileSize(file));
      totalBytes = Math.max(totalBytes, bytesDownloaded);

      logger.debug(
        `✅ Download complete: ${title} (${bytesDownloaded} bytes saved to local storage)`
      );

      if (onProgress) {
        onProgress({
          lectureId,
          progress: 1,
          bytesDownloaded,
          totalBytes,
        });
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

      this.notify();
    } catch (error: any) {
      // Captured once below, with the full context gathered in this catch.
      logger.warn(`Failed to download lecture ${lectureId}`, error);

      // Clean up partial download file if it exists
      try {
        if (file && file.exists) {
          await file.delete();
        }
      } catch (cleanupError) {
        logger.warn("Failed to clean up partial download:", cleanupError);
      }

      // Rethrown unwrapped, after the partial file is cleaned up: wrapping it
      // in a DownloadError would erase the type every caller uses to tell a
      // refusal from a fault, and they would report it to Sentry themselves.
      if (isExpectedDownloadRefusal(error)) {
        throw error;
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

      // Report download errors to Sentry with full context. Deliberate
      // refusals never reach here - they were rethrown above.
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
        ...downloadFailureContext(error),
      });

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

  private async saveResumableData(
    lectureId: string,
    resumableData: PersistedResumableData | null
  ): Promise<void> {
    const metadata = this.metadataCache.get(lectureId);
    if (!metadata && !resumableData) {
      return;
    }

    const updatedMetadata = {
      ...(metadata ?? {
        lectureId,
        title: "",
        lecturerName: "",
        duration: 0,
        downloadedAt: new Date().toISOString(),
      }),
      resumableData: resumableData ? JSON.stringify(resumableData) : undefined,
    };

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
      const partialFile = this.getPartialDownloadFile(lectureId);
      const persistedResumableData = this.parsePersistedResumableData(
        this.metadataCache.get(lectureId)?.resumableData
      );
      const resumeState =
        persistedResumableData?.pauseState.fileUri === partialFile.uri
          ? persistedResumableData.pauseState
          : null;
      const downloadUrl = resumeState?.url ?? await this.resolveDownloadUrl(lectureId, audioUrl);

      if (!resumeState && partialFile.exists) {
        partialFile.delete();
      }

      const resumableDownload: ResumableDownload = {
        id: lectureId,
        episode,
        downloadUrl,
        progressCallback,
        isPaused: false,
        bytesDownloaded: persistedResumableData?.bytesDownloaded ?? 0,
        totalBytes: persistedResumableData?.totalBytes ?? 0,
        downloadTask: this.createResumableTask(
          lectureId,
          downloadUrl,
          partialFile.uri,
          progressCallback,
          (progress) => {
            resumableDownload.bytesDownloaded = progress.bytesDownloaded;
            resumableDownload.totalBytes = progress.totalBytes;
          },
          resumeState
        ),
        resumeState,
      };

      this.activeDownloads.set(lectureId, resumableDownload);
      return resumableDownload;
    } catch (error) {
      // Rethrown rather than collapsed to null: the queue turns a null into a
      // flat "Failed to create download.", which would erase the reason and
      // leave the UI unable to tell a signed-out user what to do about it.
      if (isExpectedDownloadRefusal(error)) {
        throw error;
      }

      logger.warn("Failed to create resumable download", error);
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
  async startDownload(resumableDownload: ResumableDownload): Promise<DownloadRunResult> {
    const { id, progressCallback } = resumableDownload;
    const file = this.getPartialDownloadFile(id);
    try {
      if (!resumableDownload.downloadTask) {
        resumableDownload.downloadTask = this.createResumableTask(
          id,
          resumableDownload.downloadUrl,
          file.uri,
          progressCallback,
          (progress) => {
            resumableDownload.bytesDownloaded = progress.bytesDownloaded;
            resumableDownload.totalBytes = progress.totalBytes;
          },
          resumableDownload.resumeState
        );
      }

      const result = await this.runLegacyDownloadTask(
        resumableDownload.downloadTask,
        resumableDownload.resumeState
      );

      if (resumableDownload.isCancelled) return "cancelled";

      if (!result) {
        return resumableDownload.isPaused ? "paused" : "cancelled";
      }

      if (
        resumableDownload.resumeState?.resumeData &&
        (result.status === 200 || result.status === 416)
      ) {
        logger.warn("Server rejected byte-range resume, restarting download from scratch", {
          lectureId: id,
          status: result.status,
        });

        if (file.exists) {
          file.delete();
        }

        resumableDownload.bytesDownloaded = 0;
        resumableDownload.totalBytes = 0;
        resumableDownload.resumeState = null;
        await this.saveResumableData(id, null);
        resumableDownload.downloadTask = this.createResumableTask(
          id,
          resumableDownload.downloadUrl,
          file.uri,
          progressCallback,
          (progress) => {
            resumableDownload.bytesDownloaded = progress.bytesDownloaded;
            resumableDownload.totalBytes = progress.totalBytes;
          },
          null
        );

        return this.startDownload(resumableDownload);
      }

      if (result.status < 200 || result.status >= 300) {
        const errorMessage = getDownloadStatusErrorMessage(result.status);

        const failureContext = {
          lectureId: id,
          audioUrl: resumableDownload.downloadUrl,
          status: result.status,
        };

        logger.warn(`Download failed: ${errorMessage} (HTTP ${result.status})`, failureContext);

        throw new DownloadFailedError(errorMessage, failureContext);
      }

      if (!file.exists) {
        await this.recoverFromMissingPartialFile(id);
        throw new DownloadFailedError(DOWNLOAD_FILE_MISSING_MESSAGE, { lectureId: id });
      }

      const bytesDownloaded = Math.max(resumableDownload.bytesDownloaded, this.getFileSize(file));
      const finalFile = this.getDownloadFile(id);

      // Both files are in the same directory. Native async rename avoids
      // copying a potentially hours-long recording through a synchronous JSI
      // filesystem call, which stalls JS and duplicates disk usage.
      try {
        await moveAsync({ from: file.uri, to: finalFile.uri });
      } catch (error) {
        if (resumableDownload.isCancelled) return "cancelled";
        if (!file.exists) {
          await this.recoverFromMissingPartialFile(id);
          throw new DownloadFailedError(DOWNLOAD_FILE_MISSING_MESSAGE, { lectureId: id });
        }
        throw error;
      }
      if (resumableDownload.isCancelled) {
        await this.deleteFileIfExists(finalFile);
        return "cancelled";
      }

      const metadata: DownloadMetadata = {
        lectureId: id,
        title: resumableDownload.episode.title,
        lecturerName: resumableDownload.episode.lecturerName || "Unknown",
        coverUrl: resumableDownload.episode.coverUrl,
        audioUrl: resumableDownload.downloadUrl,
        duration: resumableDownload.episode.durationSec,
        downloadedAt: new Date().toISOString(),
        fileSize: bytesDownloaded,
      };

      this.metadataCache.set(id, metadata);
      await this.saveMetadata();
      await this.getMetadataFile(id).write(JSON.stringify(metadata, null, 2));
      this.activeDownloads.delete(id);
      this.notify();

      progressCallback({
        lectureId: id,
        progress: 1,
        bytesDownloaded,
        totalBytes: Math.max(resumableDownload.totalBytes, bytesDownloaded),
      });

      return "completed";
    } catch (error: any) {
      if (isCancelledDownloadError(error)) {
        logger.debug("Download was cancelled");
        return resumableDownload.isPaused ? "paused" : "cancelled";
      } else {
        // Reported by the download queue, which sees every failure exactly once
        // and knows which ones are refusals rather than faults.
        logger.warn("Download failed", error);
        throw error;
      }
    }
  }

  /**
   * Recovery policy when a completed download's partial file has vanished.
   *
   * Stale resume data is the thing that matters: leaving it behind makes the
   * retry ask the server to resume a byte range we can no longer satisfy, so
   * the retry fails the same way. Clearing it means the next attempt starts
   * clean.
   */
  private async recoverFromMissingPartialFile(lectureId: string): Promise<void> {
    this.activeDownloads.delete(lectureId);
    await this.saveResumableData(lectureId, null);
  }

  /**
   * Pause a resumable download
   */
  async pauseDownload(lectureId: string): Promise<void> {
    const download = this.activeDownloads.get(lectureId);
    if (download) {
      try {
        download.isPaused = true;
        const pauseState = await download.downloadTask?.pauseAsync();
        download.resumeState = pauseState ?? null;
        await this.saveResumableData(
          lectureId,
          pauseState
            ? {
              pauseState,
              bytesDownloaded: download.bytesDownloaded,
              totalBytes: download.totalBytes,
            }
            : null
        );
        this.notify();
      } catch (error) {
        logger.warn("Failed to pause download", error);
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
      // Mark cancellation before awaiting native work: completion may race it.
      download.isCancelled = true;
      try {
        await download.downloadTask?.cancelAsync();
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
