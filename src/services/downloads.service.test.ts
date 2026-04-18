const mockFiles = new Map<string, { exists: boolean; size: number }>();
const mockFetch = jest.fn();
const mockCreateDownloadResumable = jest.fn();
const mockIncrementDownloadCounter = jest.fn();
const mockRequestStoragePermission = jest.fn();
const mockAddSentryBreadcrumb = jest.fn();
const mockCaptureSentryException = jest.fn();
const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const buildUri = (...parts: Array<string | { uri: string }>) =>
  parts
    .map((part) => (typeof part === "string" ? part : part.uri))
    .join("/")
    .replace(/\/+/g, "/")
    .replace("file:/", "file://");

jest.mock("expo-sqlite/kv-store", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo/fetch", () => ({
  fetch: mockFetch,
}));

jest.mock("expo-file-system", () => {
  class MockDirectory {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = buildUri(...parts);
    }

    get exists() {
      return true;
    }

    create() {}

    list() {
      return [];
    }
  }

  class MockFile {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = buildUri(...parts);
    }

    get exists() {
      return mockFiles.get(this.uri)?.exists ?? false;
    }

    get size() {
      return mockFiles.get(this.uri)?.size ?? 0;
    }

    create() {
      mockFiles.set(this.uri, { exists: true, size: 0 });
    }

    async write(contents: string) {
      mockFiles.set(this.uri, { exists: true, size: contents.length });
    }

    async delete() {
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: {
      document: { uri: "file:///document" },
    },
  };
});

jest.mock("expo-file-system/legacy", () => ({
  createDownloadResumable: mockCreateDownloadResumable,
}));

jest.mock("./api/downloads.api", () => ({
  downloadsApi: {
    incrementDownloadCounter: mockIncrementDownloadCounter,
  },
}));

jest.mock("../utils/permissions", () => ({
  requestStoragePermission: mockRequestStoragePermission,
}));

jest.mock("./config/sentry.config", () => ({
  addSentryBreadcrumb: mockAddSentryBreadcrumb,
  captureSentryException: mockCaptureSentryException,
}));

jest.mock("../utils/logger", () => ({
  logger: mockLogger,
}));

describe("downloadsService.downloadLecture", () => {
  beforeEach(() => {
    jest.resetModules();
    mockFiles.clear();
    mockFetch.mockReset();
    mockCreateDownloadResumable.mockReset();
    mockIncrementDownloadCounter.mockReset();
    mockRequestStoragePermission.mockReset();
    mockAddSentryBreadcrumb.mockReset();
    mockCaptureSentryException.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
    mockLogger.warn.mockReset();

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: jest.fn().mockReturnValue("128"),
      },
      body: {
        getReader: jest.fn().mockReturnValue({
          read: jest
            .fn()
            .mockResolvedValueOnce({ done: false, value: new Uint8Array(128) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        }),
      },
    });

    mockIncrementDownloadCounter.mockResolvedValue({
      url: "https://cdn.example.com/audio.mp3",
    });
    mockRequestStoragePermission.mockResolvedValue(undefined);
    mockCreateDownloadResumable.mockImplementation(
      (
        url: string,
        fileUri: string,
        _options: Record<string, never>,
        onProgress?: (progress: {
          totalBytesWritten: number;
          totalBytesExpectedToWrite: number;
        }) => void
      ) => ({
        downloadAsync: jest.fn(async () => {
          onProgress?.({
            totalBytesWritten: 128,
            totalBytesExpectedToWrite: 128,
          });
          mockFiles.set(fileUri, { exists: true, size: 128 });
          return {
            status: 200,
            headers: {},
            uri: fileUri,
          };
        }),
        resumeAsync: jest.fn(),
        pauseAsync: jest.fn(),
        cancelAsync: jest.fn(),
      })
    );
  });

  it("uses Expo's native download task instead of JS streaming fetch", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { downloadsService } = require("./downloads.service");

    const progressSpy = jest.fn();
    await downloadsService.downloadLecture(
      {
        id: "lecture-1",
        title: "Lecture One",
        audioUrl: "https://example.com/original.mp3",
        lecturerName: "Ustadh",
        coverUrl: "https://example.com/cover.jpg",
        durationSec: 360,
        seriesId: "",
        plays: 0,
        liked: false,
        language: "English",
        downloads: 0,
        createdAt: new Date().toISOString(),
      },
      progressSpy
    );

    expect(mockCreateDownloadResumable).toHaveBeenCalledWith(
      "https://cdn.example.com/audio.mp3",
      "file://document/downloads/lecture-1.mp3",
      {},
      expect.any(Function)
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(progressSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        lectureId: "lecture-1",
        progress: 1,
        bytesDownloaded: 128,
      })
    );
  });

  it("resolves the queued download URL through the downloads API before creating a resumable task", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { downloadsService } = require("./downloads.service");

    const resumableDownload = await downloadsService.createDownload(
      {
        id: "lecture-queue-1",
        title: "Lecture Queue One",
        audioUrl: "https://example.com/original.mp3",
        lecturerName: "Ustadh",
        coverUrl: "https://example.com/cover.jpg",
        durationSec: 360,
        seriesId: "",
        plays: 0,
        liked: false,
        language: "English",
        downloads: 0,
        createdAt: new Date().toISOString(),
      },
      jest.fn()
    );

    expect(resumableDownload).not.toBeNull();
    expect(mockIncrementDownloadCounter).toHaveBeenCalledWith("lecture-queue-1");
    expect(mockCreateDownloadResumable).toHaveBeenCalledWith(
      "https://cdn.example.com/audio.mp3",
      "file://document/downloads/lecture-queue-1.part",
      {},
      expect.any(Function),
      undefined
    );
  });
});
