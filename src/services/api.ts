import axios from 'axios';

// Base URL for your API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://backend.dawahbox.com/api/';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-project': '206cf92c-8a46-45ef-bf3f-a6ef92fc6f25',
    'Origin': 'https://dawahbox.com', // Correct origin domain for API access
  },
});

// API endpoints
export const API_ENDPOINTS = {
  EPISODES: '/episodes',
  LECTURERS: '/lecturers',
  SERIES: '/series',
  CATEGORIES: '/categories',
  RECENT_PLAYS: '/recent-plays',
  SEARCH: '/search',
  FEATURED: '/featured',
  RECENT_POSTED: '/recent-posted',
  // Legacy PHP endpoints that are still in use
  RECENT_LECTURES: '/leclisting_recent.php',
  TRENDING_LECTURES: '/popular_lec_api.php',
  FEATURED_LECTURES: '/featuredApi.php',
  SEARCH_LECTURES: '/searchApi.php',
  SEARCH_ALL_CONTENT: '/searchApi.php',
  RECENT_PLAYS_PHP: '/recentApi.php',
};

// API functions
export default api;
