/**
 * Base API Client
 * Handles all HTTP requests with retry logic, error handling, and caching
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG } from '../config/api.config';
import { captureSentryException, addSentryBreadcrumb } from '../config/sentry.config';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: any,
    public isNetworkError: boolean = false,
    public isTimeout: boolean = false,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Request configuration interface
export interface RequestConfig extends Omit<RequestInit, 'cache'> {
  timeout?: number;
  retry?: boolean;
  retryAttempts?: number;
  useCache?: boolean;
  cacheTTL?: number;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

// Response wrapper interface
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  cached?: boolean;
  timestamp: number;
}

// Cache entry interface
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class ApiClient {
  private static instance: ApiClient;
  private abortControllers: Map<string, AbortController> = new Map();
  private activeRequests = 0;
  private authToken: string | null = null;
  private _authTokenChangeListener: ((token: string | null) => void) | null = null;

  private constructor() {
    // Only load auth token in React Native environment
    if (typeof window !== 'undefined') {
      this.loadAuthToken();
    }
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Register a listener for auth token changes.
   * This is primarily used by the authStore to keep its state in sync.
   */
  public setAuthTokenChangeListener(listener: (token: string | null) => void): void {
    this._authTokenChangeListener = listener;
  }

  /**
   * Load auth token from storage
   */
  private async loadAuthToken(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const token = await AsyncStorage.getItem('auth_token');
      this.authToken = token;
      this._authTokenChangeListener?.(token); // Notify listener on load
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  /**
   * Set auth token
   */
  public async setAuthToken(token: string | null): Promise<void> {
    this.authToken = token;
    this._authTokenChangeListener?.(token); // Notify listener on change
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        await AsyncStorage.setItem('auth_token', token);
      } else {
        await AsyncStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Failed to set/remove auth token:', error);
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_CONFIG.BASE_URL}${endpoint}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }

  /**
   * Get default headers
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-project': API_CONFIG.X_PROJECT_KEY,
      'Origin': API_CONFIG.ORIGIN,
      'Referer': API_CONFIG.REFERER,
      'User-Agent': API_CONFIG.USER_AGENT,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Cache key generator
   */
  private getCacheKey(url: string, method: string = 'GET'): string {
    return `cache_${method}_${url}`;
  }

  /**
   * Get cached data
   */
  private async getCachedData(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);
      const now = Date.now();

      if (now - entry.timestamp > entry.ttl * 1000) {
        // Cache expired
        await AsyncStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  private async setCachedData(key: string, data: any, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Execute request with timeout
   */
  private async executeWithTimeout(
    url: string,
    config: RequestConfig,
    timeout: number,
  ): Promise<Response> {
    const abortController = new AbortController();
    const requestId = `${config.method || 'GET'}_${url}`;

    // Cancel any existing request to the same endpoint
    if (this.abortControllers.has(requestId)) {
      this.abortControllers.get(requestId)?.abort();
    }
    this.abortControllers.set(requestId, abortController);

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);

      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', undefined, undefined, false, true);
      }
      throw error;
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryRequest(
    url: string,
    config: RequestConfig,
    attempt: number = 1,
  ): Promise<Response> {
    const maxAttempts = config.retryAttempts || API_CONFIG.RETRY.MAX_ATTEMPTS;
    const timeout = config.timeout || API_CONFIG.TIMEOUTS.DEFAULT;

    try {
      return await this.executeWithTimeout(url, config, timeout);
    } catch (error: any) {
      const isLastAttempt = attempt >= maxAttempts;
      const shouldRetry = config.retry !== false && !isLastAttempt;

      if (!shouldRetry) {
        throw error;
      }

      // Check if error is retryable
      if (error instanceof ApiError && error.isTimeout) {
        // Timeout errors are retryable
      } else if (error.statusCode && !API_CONFIG.RETRY.RETRY_CONDITIONS.includes(error.statusCode)) {
        // Non-retryable status code
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        API_CONFIG.RETRY.INITIAL_DELAY * Math.pow(API_CONFIG.RETRY.BACKOFF_FACTOR, attempt - 1),
        API_CONFIG.RETRY.MAX_DELAY,
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = delay + jitter;

      console.log(`Retrying request (attempt ${attempt}/${maxAttempts}) after ${totalDelay}ms`);

      await new Promise(resolve => setTimeout(resolve, totalDelay));
      return this.retryRequest(url, config, attempt + 1);
    }
  }

  /**
   * Rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    while (this.activeRequests >= API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_SECOND) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.activeRequests++;
    setTimeout(() => {
      this.activeRequests--;
    }, 1000);
  }

  /**
   * Main request method
   */
  public async request<T = any>(
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    // Define these outside try block so they're available in catch
    let url = '';
    let method = '';

    try {
      // Enforce rate limiting
      await this.enforceRateLimit();

      url = this.buildUrl(endpoint, config.params);
      method = config.method || 'GET';

      // Check cache for GET requests
      if (method === 'GET' && config.useCache !== false) {
        const cacheKey = this.getCacheKey(url, method);
        const cachedData = await this.getCachedData(cacheKey);

        if (cachedData) {
          console.log(`Cache hit for ${url}`);
          return {
            data: cachedData,
            status: 200,
            headers: new Headers(),
            cached: true,
            timestamp: Date.now(),
          };
        }
      }

      // Prepare request config
      const requestConfig: RequestConfig = {
        ...config,
        method,
        headers: {
          ...this.getDefaultHeaders(),
          ...config.headers,
        },
      };

      // Add body for non-GET requests
      if (config.body && method !== 'GET') {
        requestConfig.body = typeof config.body === 'string'
          ? config.body
          : JSON.stringify(config.body);
      }

      // Log the actual HTTP request being made
      console.log('🌐 HTTP Request:', {
        method,
        url,
        headers: requestConfig.headers,
        hasBody: !!requestConfig.body,
        body: requestConfig.body ? (typeof requestConfig.body === 'string' ? requestConfig.body : JSON.stringify(requestConfig.body)) : null,
      });

      // Add breadcrumb for Sentry tracking
      addSentryBreadcrumb(
        `API ${method} ${endpoint}`,
        'http',
        {
          method,
          url,
          hasBody: !!requestConfig.body,
        }
      );

      // Execute request with retry logic
      const response = await this.retryRequest(url, requestConfig);

      // Log HTTP response status
      console.log('📡 HTTP Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      // Check response status
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        const apiError = new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData,
        );

        // Report API errors to Sentry
        captureSentryException(apiError, {
          endpoint,
          method,
          url,
          statusCode: response.status,
          errorData,
        });

        throw apiError;
      }

      // Parse response
      const data = await response.json();

      // Log parsed response data
      console.log('📦 Parsed Response Data:', {
        hasData: !!data,
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataKeys: data && typeof data === 'object' ? Object.keys(data).slice(0, 10) : [],
        sampleData: Array.isArray(data) ? data[0] : (data && typeof data === 'object' ? Object.keys(data).slice(0, 5) : data),
      });

      // Cache successful GET requests
      if (method === 'GET' && config.useCache !== false) {
        const cacheTTL = config.cacheTTL || API_CONFIG.CACHE.LECTURES_TTL;
        const cacheKey = this.getCacheKey(url, method);
        await this.setCachedData(cacheKey, data, cacheTTL);
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        cached: false,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.log('Error caught in base.api.ts request method:', error);

      // If the error is already an ApiError with a status code, re-throw it directly.
      // This prevents HTTP errors from being re-classified as network errors.
      if (error instanceof ApiError && error.statusCode) {
        throw error;
      }

      // Handle network errors (avoid web-only navigator.onLine on native)
      const isNavigatorOffline =
        typeof navigator !== 'undefined' &&
        'onLine' in navigator &&
        navigator.onLine === false;

      let isOffline = isNavigatorOffline;
      try {
        const netState = await NetInfo.fetch();
        if (netState.isConnected === false || netState.isInternetReachable === false) {
          isOffline = true;
        }
      } catch (netInfoError) {
        console.warn('NetInfo fetch failed:', netInfoError);
      }

      if (error.message === 'Network request failed' || isOffline) {
        const networkError = new ApiError(
          'No internet connection',
          undefined,
          undefined,
          true,
        );

        // Report network errors to Sentry
        captureSentryException(networkError, {
          endpoint,
          method: method || 'unknown',
          url: url || endpoint,
          errorType: 'network',
        });

        throw networkError;
      }

      // Re-throw ApiError instances (already reported)
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap unknown errors and report to Sentry
      const unknownError = new ApiError(
        error.message || 'An unexpected error occurred',
        undefined,
        error,
      );

      captureSentryException(unknownError, {
        endpoint,
        method: method || 'unknown',
        url: url || endpoint,
        errorType: 'unknown',
        originalError: error,
      });

      throw unknownError;
    }
  }

  /**
   * GET request helper
   */
  public async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
      params,
    });
  }

  /**
   * POST request helper
   */
  public async post<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body,
    });
  }

  /**
   * PUT request helper
   */
  public async put<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body,
    });
  }

  /**
   * DELETE request helper
   */
  public async delete<T = any>(
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }

  /**
   * Cancel all pending requests
   */
  public cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Clear cache
   */
  public async clearCache(pattern?: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => {
        if (!key.startsWith('cache_')) return false;
        if (pattern) return key.includes(pattern);
        return true;
      });

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const apiClient = ApiClient.getInstance();
