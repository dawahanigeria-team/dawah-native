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
  audioUrl: string;
  videoUrl?: string;
  seriesId: string;
  plays: number;
  liked: boolean;
  language: string;
  downloads: number;
  createdAt: string; // ISO date string
  lecturerName?: string; // Optional lecturer name
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

export interface Video {
  id: string;
  title: string;
  youtubeUrl: string; // Full YouTube URL
  youtubeId: string; // Extracted YouTube video ID for player
  thumbnailUrl: string;
  description?: string;
  duration?: string; // Duration in "HH:MM:SS" format
  durationSec: number; // Duration in seconds for consistency with Episode
  views: number;
  likes: number;
  createdAt: string; // ISO date string
  lecturerName?: string;
  language?: string;
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
  // Queue management
  queue: Episode[];
  currentQueueIndex: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
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
