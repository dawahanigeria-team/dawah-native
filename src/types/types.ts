export interface Lecturer {
  id: string;
  name: string;
  avatarUrl: string;
  language: string;
  bioShort: string;
}

export interface Series {
  id: string;
  title: string;
  coverUrl: string;
  language: string;
  tags: string[];
  lecturerId: string;
}

export interface Episode {
  id: string;
  title: string;
  durationSec: number;
  coverUrl: string;
  /**
   * High-resolution art for full-width surfaces, from the API's `lec_img`.
   * `coverUrl` resolves to /dc_images/ at 250x200, which a full-width hero
   * upscales past 4x; this is the 1920x1080 source. Separate field rather
   * than a swap so the small slots keep the lighter image.
   */
  coverUrlLarge?: string;
  audioUrl: string;
  seriesId: string;
  plays: number;
  liked: boolean;
  language: string;
  downloads: number;
  createdAt: string; // ISO date string
  lecturerName?: string; // Optional lecturer name
  rpname?: string;
  reciterName?: string;
  reciter_name?: string;
  isReciter?: boolean;
  is_reciter?: boolean;
  reciter?: {
    name?: string;
    isReciter?: boolean;
  };
  raw?: {
    rpname?: string;
    reciter_name?: string;
    is_reciter?: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  coverUrl: string;
}

export interface Playlist {
  id: string;
  title: string;
  coverUrl: string;
  itemCount: number;
}

export interface PlayerState {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  isExpanded: boolean;
  isLoading: boolean;
  playbackSpeed: number;
  volume: number;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  errorMessage: string | null;
  // Queue management
  queue: Episode[];
  originalQueue: Episode[]; // Stores unshuffled order for restoration
  currentQueueIndex: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  // Sleep timer. Stored as an absolute epoch-ms deadline rather than a
  // remaining duration so it stays correct across backgrounding, where JS
  // timers are throttled but playback continues.
  sleepTimerEndsAt: number | null;
  // "Stop at the end of this lecture" — has no deadline, so it is tracked
  // separately from sleepTimerEndsAt.
  sleepTimerEndOfTrack: boolean;
}

export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  Category: { category: Category };
  Collection: { series: Series };
  Episode: { episode: Episode };
  Lecturer: { lecturer: Lecturer };
  PlayerFull: { episode: Episode };
  Settings: undefined;
};
