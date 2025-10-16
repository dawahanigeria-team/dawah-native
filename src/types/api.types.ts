/**
 * API Response Types
 * Type definitions for all API responses
 */

// Base API Response
export interface BaseApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

// Pagination Response
export interface PaginatedResponse<T = any> extends BaseApiResponse<T[]> {
  total: number;
  page: number;
  total_pages: number;
  per_page: number;
  data: T[];
}

// Search Types
export type SearchType = 'lectures' | 'lecturers' | 'albums' | 'playlists' | 'all';

// Search Result Types
export interface SearchLecture {
  // Search API response fields
  id?: string;
  mp3_title?: string;
  mp3_duration?: string; // Format: "HH:MM:SS"
  mp3_url?: string;
  lecturer_name?: string;
  lecturer_id?: string;
  lecturer_image?: string;
  cat_name?: string;
  views?: string;
  likes?: string;
  downloads?: string;
  language?: string;
  created_at?: string;
  description?: string;

  // Popular Lectures API fields
  nid?: string | number;
  Title?: string;
  audio?: string;
  duration?: string;
  img?: string;
  rpname?: string;
  rp_id?: number;
  lang?: string;
  cats?: string;
  favorites?: number;
  share?: number;
  comment?: number;
  keyword?: string;
  key_id?: number[];

  // Legacy fields for backward compatibility
  Duration?: string;
  Plays?: string;
  Likes?: string;
  Downloads?: string;
  Language?: string;
  ResourcePerson?: string;
  ResourcePersonId?: string;
  CoverUrl?: string;
  AudioUrl?: string;
  Tags?: string[];
  CreatedAt?: string;
  Description?: string;
}

export interface SearchLecturer {
  id: string;
  name: string;
  avatarUrl?: string;
  language: string[];
  bioShort?: string;
  bioFull?: string;
  verified: boolean;
  followers: number;
  totalLectures: number;
  totalAlbums: number;
}

export interface SearchAlbum {
  id: string;
  title: string;
  coverUrl?: string;
  lecturerId: string;
  lecturerName: string;
  language: string;
  trackCount: number;
  totalDuration: string; // Format: "HH:MM:SS"
  plays: number;
  tags?: string[];
  description?: string;
  createdAt: string;
}

export interface SearchPlaylist {
  id: string;
  title: string;
  coverUrl?: string;
  userId?: string;
  userName?: string;
  isPublic: boolean;
  itemCount: number;
  totalDuration: string; // Format: "HH:MM:SS"
  followers: number;
  description?: string;
  updatedAt: string;
}

// Unified Search Result
export type SearchResult =
  | SearchLecture
  | SearchLecturer
  | SearchAlbum
  | SearchPlaylist;

// Search Response
export interface SearchResponse<T = SearchResult> extends PaginatedResponse<T> {
  type: SearchType;
  query: string;
  filters?: {
    language?: string;
    category?: string;
    duration?: string;
  };
}

// Quick Search Response (for typeahead)
export interface QuickSearchResponse {
  success: boolean;
  results: {
    type: SearchType;
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
  }[];
}

// Lecture Detail Response
export interface LectureDetailResponse extends BaseApiResponse {
  lecture: {
    nid: string;
    Title: string;
    Duration: string;
    AudioUrl: string;
    VideoUrl?: string;
    CoverUrl?: string;
    Description?: string;
    Plays: string;
    Likes: string;
    Downloads: string;
    Language: string;
    ResourcePerson: string;
    ResourcePersonId: string;
    SeriesId?: string;
    SeriesTitle?: string;
    Tags: string[];
    CreatedAt: string;
    UpdatedAt?: string;
    Transcript?: string;
    RelatedLectures?: SearchLecture[];
  };
}

export interface LectureDetailApiItem {
  updated_date?: string;
  nid?: number;
  Title?: string;
  audio?: string;
  amr_url?: string;
  img?: string;
  duration?: string;
  description?: string;
  mp3_size?: string;
  amr_size?: string;
  cats?: string | string[];
  cat_id?: string[];
  album_id?: number;
  lec_img?: string;
  post_date?: string;
  views?: number | string;
  favorites?: number | string;
  share?: number | string;
  comment?: number | string;
  downloads?: number | string;
  lang?: string;
  rpname?: string;
  album_name?: string;
  charts?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  reciter_id?: number;
  reciter_name?: string;
  reciter_image?: string;
  is_reciter?: boolean;
}

export interface LectureDetail {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  amrUrl?: string;
  coverUrl: string;
  backdropUrl?: string;
  durationSec: number;
  durationLabel?: string;
  mp3Size?: string;
  amrSize?: string;
  categories: string[];
  categoryIds: string[];
  albumId?: string;
  albumName?: string;
  views: number;
  favorites: number;
  shares: number;
  downloads: number;
  comments: number;
  language?: string;
  lecturerName?: string;
  updatedDate?: string;
  postedDate?: string;
  charts?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  reciter?: {
    id?: number;
    name?: string;
    image?: string;
    isReciter?: boolean;
  };
  raw?: LectureDetailApiItem;
}

// Category Response
export interface CategoryResponse extends BaseApiResponse {
  categories: {
    id: string;
    name: string;
    icon?: string;
    coverUrl?: string;
    lectureCount: number;
    description?: string;
    subcategories?: {
      id: string;
      name: string;
      lectureCount: number;
    }[];
  }[];
}

// User Auth Response
export interface AuthResponse extends BaseApiResponse {
  user?: {
    id: string;
    username: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    language: string;
    createdAt: string;
    isPremium: boolean;
  };
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Favorite Response
export interface FavoriteResponse extends BaseApiResponse {
  favorites: SearchLecture[];
  total: number;
}

// Playlist Detail Response
export interface PlaylistDetailResponse extends BaseApiResponse {
  playlist: {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    userId: string;
    userName: string;
    isPublic: boolean;
    items: SearchLecture[];
    totalDuration: string;
    createdAt: string;
    updatedAt: string;
    followers: number;
    isFollowing?: boolean;
  };
}

// Recent Plays Response
export interface RecentPlaysResponse extends BaseApiResponse {
  plays: {
    lecture: SearchLecture;
    lastPosition: number;
    lastPlayedAt: string;
    completed: boolean;
    progress: number; // Percentage
  }[];
}

// Comment Response
export interface CommentResponse extends BaseApiResponse {
  comments: {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: string;
    likes: number;
    isLiked?: boolean;
    replies?: {
      id: string;
      userId: string;
      userName: string;
      content: string;
      timestamp: string;
    }[];
  }[];
  total: number;
}

// Download Link Response
export interface DownloadLinkResponse extends BaseApiResponse {
  downloadUrl: string;
  expiresAt: string;
  fileSize: number;
  fileName: string;
  format: string;
}

// Chart Response
export interface ChartResponse<T = any> extends BaseApiResponse {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  items: (T & {
    rank: number;
    previousRank?: number;
    trend: 'up' | 'down' | 'stable' | 'new';
  })[];
  updatedAt: string;
}

// Language Response
export interface LanguageResponse extends BaseApiResponse {
  languages: {
    id: string;
    code: string;
    name: string;
    nativeName: string;
    isRTL: boolean;
    lectureCount: number;
  }[];
}

// Error Response
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
  statusCode?: number;
  timestamp: string;
}
