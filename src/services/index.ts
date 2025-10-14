/**
 * Services Index
 * Main export point for all API services
 */

// Export configuration
export * from './config/api.config';

// Export base API client
export { apiClient, ApiError, type ApiResponse, type RequestConfig } from './api/base.api';

// Export search API service
export { searchApi, type SearchParams } from './api/search.api';

// Re-export API types
export * from '../types/api.types';