/**
 * Services Index
 * Main export point for all API services
 */

// Export configuration
export { API_CONFIG, type ApiEndpoint } from './config/api.config';

// Export base API client
export { apiClient, ApiError, type ApiResponse, type RequestConfig } from './api/base.api';

// Export search API service
export { searchApi, type SearchParams } from './api/search.api';
export { lectureDetailApi, type LectureDetailParams } from './api/lectureDetail.api';

// Re-export API types
export type * from '../types/api.types';
