/**
 * API Configuration
 * Central configuration for all API-related settings
 */

import { ENV } from '@/config/env';

export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  X_PROJECT_KEY: ENV.API_PROJECT_KEY,
  ORIGIN: 'https://dawahnigeria.com',
  REFERER: 'https://dawahnigeria.com/',
  USER_AGENT: 'DawahNigeria/1.0.0 (Mobile App)',

  // Timeout settings (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 30000,        // 30 seconds for normal requests
    UPLOAD: 120000,        // 2 minutes for uploads
    DOWNLOAD: 300000,      // 5 minutes for downloads
    SEARCH: 10000,         // 10 seconds for search
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,   // 1 second
    MAX_DELAY: 10000,      // 10 seconds
    BACKOFF_FACTOR: 2,     // Exponential backoff
    RETRY_CONDITIONS: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
  },

  // Cache configuration (in seconds)
  CACHE: {
    SEARCH_TTL: 300,       // 5 minutes
    LECTURES_TTL: 600,     // 10 minutes
    CATEGORIES_TTL: 3600,  // 1 hour
    USER_DATA_TTL: 60,     // 1 minute
    STATIC_TTL: 86400,     // 24 hours for static content
  },

  // Default values
  DEFAULT_LANGUAGE_ID: 8,

  // API Endpoints
  ENDPOINTS: {
    // Search
    SEARCH: '/api/searchApi.php',

    // Lectures
    LECTURES: '/api/leclistingapi.php',
    LECTURES_RECENT: '/api/leclisting_recent.php',
    LECTURE_DETAIL: '/api/fetchaudio.php',

    // Albums
    ALBUMS: '/api/albumlisting.php',
    ALBUMS_BY_LECTURER: '/api/albumlisting_rp.php',
    ALBUM_TRACKS: '/api/albumtrackssapi.php',

    // Lecturers
    LECTURERS: '/api/fetchcatrps.php',
    LECTURER_DETAIL: '/api/fetchrp_detail.php',
    LECTURER_LECTURES: '/api/fetch_lecbyRp.php',
    LECTURER_FOLLOW: '/api/lecturer_follow.php',

    // Categories
    CATEGORIES: '/api/categorylist.php',
    CATEGORY_LECTURES: '/api/categorylectures.php',

    // User Auth
    AUTH_LOGIN: '/user_auth.php',
    AUTH_REGISTER: '/user_auth.php',
    AUTH_FORGOT_PASSWORD: '/api/forgot_passwordApi.php',

    // User Data
    USER_PROFILE: '/api/userprofile.php',
    USER_FAVORITES: '/api/userfavorites.php',
    USER_PLAYLISTS: '/api/userplaylists.php',
    USER_RECENT_PLAYS: '/api/recentplays.php',

    // Social
    COMMENTS: '/api/comments.php',
    TOGGLE_FAVORITE: '/api/togglefavorite.php',
    SHARE: '/api/share.php',

    // Charts
    LECTURE_CHARTS: '/api/lecturecharts.php',
    ALBUM_CHARTS: '/api/albumcharts.php',
    LECTURER_CHARTS: '/api/lecturercharts.php',
    PLAYLIST_CHARTS: '/api/playlistcharts.php',

    // Media
    DOWNLOAD_LINK: '/api/downloadlink.php',
    MEDIA_BASE: ENV.MEDIA_BASE_URL,
  },

  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_SECOND: 10,
    BURST_SIZE: 20,
  },
} as const;

// Type for API endpoints
export type ApiEndpoint = typeof API_CONFIG.ENDPOINTS[keyof typeof API_CONFIG.ENDPOINTS];

// Environment-specific overrides
if (__DEV__) {
  // Development environment adjustments
  console.warn('API Running in Development Mode');
}
