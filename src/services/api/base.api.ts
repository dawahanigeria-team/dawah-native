/**
 * Base API Client
 * Handles all HTTP requests with retry logic, error handling, and caching
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG } from '../config/api.config';
import { captureSentryException, addSentryBreadcrumb } from '../config/sentry.config';
import { secureStoreCompat } from '../storage/secureStoreCompat';
import {
  getErrorMessage,
  isCancelledRequestError,
  isTransientNetworkError,
  isTransientNetworkErrorText,
} from './networkErrors';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: any,
    public isNetworkError: boolean = false,
    public isTimeout: boolean = false,
    public isCancelled: boolean = false,
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
  skipTokenRefresh?: boolean;
}

export const createTokenRefreshRetryConfig = (config: RequestConfig): RequestConfig => {
  const { signal: _signal, ...retryConfig } = config;
  return { ...retryConfig, skipTokenRefresh: true };
};

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

interface RequestToken {
  cancelled: boolean;
  listeners: Set<() => void>;
}

class ApiClient {
  private static instance: ApiClient;
  private abortControllers: Map<string, AbortController> = new Map();
  private requestTokens: Map<string, RequestToken> = new Map();
  private activeRequests = 0;
  private authToken: string | null = null;
  private authTokenHydrationPromise: Promise<void> | null = null;
  private hasHydratedAuthToken = false;
  private _authTokenChangeListener: ((token: string | null) => void) | null = null;
  private _refreshPromise: Promise<boolean> | null = null;
  private _onRefreshFailure: (() => void) | null = null;

  private constructor() {
    // Only load auth token in React Native environment
    if (typeof window !== 'undefined') {
      void this.hydrateAuthTokenFromStorage();
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

  public setOnRefreshFailure(callback: () => void): void {
    this._onRefreshFailure = callback;
  }

  /**
   * Hydrate auth token from storage.
   * Prefer access_token but fall back to legacy auth_token.
   */
  private async hydrateAuthTokenFromStorage(force: boolean = false): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!force && this.hasHydratedAuthToken) return;
    if (this.authTokenHydrationPromise) {
      await this.authTokenHydrationPromise;
      return;
    }

    this.authTokenHydrationPromise = (async () => {
      let token: string | null = null;
      try {
        const accessToken = await secureStoreCompat.getItemAsync('access_token');
        token = accessToken ?? (await secureStoreCompat.getItemAsync('auth_token'));
      } catch (error) {
        console.error('Failed to load auth token:', error);
      } finally {
        this.authToken = token;
        this._authTokenChangeListener?.(token);
        this.hasHydratedAuthToken = true;
        this.authTokenHydrationPromise = null;
      }
    })();

    try {
      await this.authTokenHydrationPromise;
    } catch {
      // No-op: handled above
    }
  }

  /**
   * Set auth token
   */
  public async setAuthToken(token: string | null): Promise<void> {
    this.authToken = token;
    this.hasHydratedAuthToken = true;
    this._authTokenChangeListener?.(token);
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        await secureStoreCompat.setItemAsync('auth_token', token);
      } else {
        await secureStoreCompat.deleteItemAsync('auth_token');
      }
    } catch (error) {
      console.error('Failed to set/remove auth token:', error);
    }
  }

  private isExpiredTokenError(errorData: any): boolean {
    const text = (errorData?.message || errorData?.error || '').toLowerCase();
    return text.includes('expired') && text.includes('token');
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        const refreshToken = await secureStoreCompat.getItemAsync('refresh_token');
        if (!refreshToken) return false;

        const response = await this.request<{
          data: { tokens: { access_token: string; refresh_token: string } };
        }>('/api/user_auth.php', {
          method: 'POST',
          body: JSON.stringify({ action: 'refresh_token', refresh_token: refreshToken }),
          skipTokenRefresh: true,
          retry: false,
        });

        const { access_token, refresh_token } = response.data.data.tokens;
        await this.setAuthToken(access_token);
        await secureStoreCompat.setItemAsync('access_token', access_token);
        await secureStoreCompat.setItemAsync('refresh_token', refresh_token);
        await secureStoreCompat.setItemAsync('auth_token', access_token);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      this._refreshPromise = null;
    });

    return this._refreshPromise;
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

  private cancelRequestToken(token: RequestToken): void {
    if (token.cancelled) {
      return;
    }
    token.cancelled = true;
    token.listeners.forEach(listener => listener());
    token.listeners.clear();
  }

  private createRequestToken(requestId: string): RequestToken {
    const existing = this.requestTokens.get(requestId);
    if (existing) {
      this.cancelRequestToken(existing);
    }

    const token: RequestToken = { cancelled: false, listeners: new Set() };
    this.requestTokens.set(requestId, token);
    return token;
  }

  private async waitForDelayOrCancel(delay: number, token: RequestToken): Promise<void> {
    if (token.cancelled) {
      throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        token.listeners.delete(onCancel);
        resolve();
      }, delay);

      const onCancel = () => {
        clearTimeout(timeoutId);
        token.listeners.delete(onCancel);
        reject(new ApiError('Request cancelled', undefined, undefined, false, false, true));
      };

      token.listeners.add(onCancel);
    });
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
   * Expose cached response for a specific request (used for stale-on-timeout fallback).
   */
  public async getCachedResponse<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    method: string = 'GET',
  ): Promise<ApiResponse<T> | null> {
    const url = this.buildUrl(endpoint, params);
    const cacheKey = this.getCacheKey(url, method);
    const cachedData = await this.getCachedData(cacheKey);

    if (cachedData === null) {
      return null;
    }

    return {
      data: cachedData as T,
      status: 200,
      headers: new Headers(),
      cached: true,
      timestamp: Date.now(),
    };
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
    requestId: string,
    requestToken: RequestToken,
  ): Promise<Response> {
    const abortController = new AbortController();
    let didTimeout = false;
    let didCallerAbort = false;
    const externalSignal = config.signal;

    if (requestToken.cancelled) {
      throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
    }
    if (externalSignal?.aborted) {
      throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
    }

    const onExternalAbort = () => {
      didCallerAbort = true;
      abortController.abort();
    };
    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort);
    }

    // Cancel any existing request to the same endpoint
    if (this.abortControllers.has(requestId)) {
      this.abortControllers.get(requestId)?.abort();
    }
    this.abortControllers.set(requestId, abortController);

    const timeoutId = setTimeout(() => {
      didTimeout = true;
      abortController.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }

      if (isCancelledRequestError(error)) {
        if (didTimeout) {
          throw new ApiError(
            'The request is taking longer than usual. Please check your internet connection and try again.',
            undefined,
            undefined,
            false,
            true
          );
        }
        if (didCallerAbort) {
          throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
        }
        throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
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
    requestId: string,
    requestToken: RequestToken,
    attempt: number = 1,
  ): Promise<Response> {
    const maxAttempts = config.retryAttempts || API_CONFIG.RETRY.MAX_ATTEMPTS;
    const timeout = config.timeout || API_CONFIG.TIMEOUTS.DEFAULT;

    if (requestToken.cancelled) {
      throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
    }

    try {
      return await this.executeWithTimeout(url, config, timeout, requestId, requestToken);
    } catch (error: any) {
      const isLastAttempt = attempt >= maxAttempts;
      const shouldRetry = config.retry !== false && !isLastAttempt;

      if (!shouldRetry) {
        throw error;
      }

      // Check if error is retryable
      if (error instanceof ApiError && error.isCancelled) {
        throw error;
      }
      if (isCancelledRequestError(error)) {
        throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
      }
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

      if (__DEV__) console.log(`Retrying request (attempt ${attempt}/${maxAttempts}) after ${totalDelay}ms`);

      await this.waitForDelayOrCancel(totalDelay, requestToken);
      return this.retryRequest(url, config, requestId, requestToken, attempt + 1);
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
    let requestId = '';
    let requestToken: RequestToken | null = null;

    try {
      // Enforce rate limiting
      await this.enforceRateLimit();
      await this.hydrateAuthTokenFromStorage();

      url = this.buildUrl(endpoint, config.params);
      method = config.method || 'GET';
      requestId = `${method}_${url}`;
      requestToken = this.createRequestToken(requestId);

      // Check cache for GET requests
      if (method === 'GET' && config.useCache !== false) {
        const cacheKey = this.getCacheKey(url, method);
        const cachedData = await this.getCachedData(cacheKey);

        if (cachedData) {
          if (__DEV__) console.log(`Cache hit for ${url}`);
          return {
            data: cachedData,
            status: 200,
            headers: new Headers(),
            cached: true,
            timestamp: Date.now(),
          };
        }
      }

      // Check if body is FormData to handle it specially
      const isFormData = config.body instanceof FormData;

      // Prepare request config
      const requestConfig: RequestConfig = {
        ...config,
        method,
        headers: {
          ...this.getDefaultHeaders(),
          ...config.headers,
        },
      };

      // Don't set Content-Type for FormData - fetch will set it automatically with boundary
      if (isFormData && requestConfig.headers) {
        delete requestConfig.headers['Content-Type'];
      }

      // Add body for non-GET requests
      if (config.body && method !== 'GET') {
        if (isFormData) {
          // Pass FormData as-is - don't stringify it
          requestConfig.body = config.body as any;
        } else {
          // For non-FormData, use existing logic
          requestConfig.body = typeof config.body === 'string'
            ? config.body
            : JSON.stringify(config.body);
        }
      }

      if (__DEV__) {
        console.log('🌐 HTTP Request:', {
          method,
          url,
          hasBody: !!requestConfig.body,
        });
      }

      // Add breadcrumb for Sentry tracking
      addSentryBreadcrumb(
        `API ${method} ${endpoint}`,
        'http',
        {
          method,
          url,
          hasBody: !!requestConfig.body,
          bodyType: isFormData ? 'FormData' : 'JSON',
        }
      );

      // Execute request with retry logic
      const response = await this.retryRequest(url, requestConfig, requestId, requestToken);

      if (__DEV__) {
        console.log('📡 HTTP Response:', {
          url,
          status: response.status,
          ok: response.ok,
        });
      }

      const responseText = await response.text();
      const tryParseJson = (text: string) => {
        if (!text) return { parsed: null, isJson: false };
        try {
          return { parsed: JSON.parse(text), isJson: true };
        } catch {
          return { parsed: null, isJson: false };
        }
      };
      const { parsed: parsedBody, isJson } = tryParseJson(responseText);

      // Check response status
      if (!response.ok) {
        const errorData = isJson ? parsedBody : { message: responseText };

        if (
          response.status === 401 &&
          !config.skipTokenRefresh &&
          this.authToken &&
          this.isExpiredTokenError(errorData)
        ) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.request<T>(endpoint, createTokenRefreshRetryConfig(config));
          } else {
            this._onRefreshFailure?.();
          }
        }

        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        const apiError = new ApiError(
          (errorData && errorData.message) || `HTTP ${response.status}: ${response.statusText}`,
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
      if (!isJson) {
        if (isTransientNetworkErrorText(responseText)) {
          throw new ApiError(
            'The network connection was interrupted while receiving data. Please try again.',
            undefined,
            { raw: responseText },
            true,
          );
        }

        const apiError = new ApiError(
          responseText.trim().length > 0 ? 'Invalid JSON response' : 'Empty response from server',
          response.status,
          { raw: responseText },
        );
        captureSentryException(apiError, {
          endpoint,
          method,
          url,
          statusCode: response.status,
          errorData: { raw: responseText },
        });
        throw apiError;
      }
      const data = parsedBody;

      if (__DEV__) {
        console.log('📦 Parsed Response Data:', {
          hasData: !!data,
          dataType: typeof data,
          isArray: Array.isArray(data),
        });
      }

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
      // If the error is already an ApiError with a status code, re-throw it directly.
      // This prevents HTTP errors from being re-classified as network errors.
      if (error instanceof ApiError && error.statusCode) {
        throw error;
      }
      if (error instanceof ApiError && error.isCancelled) {
        throw error;
      }
      if (error instanceof ApiError && error.isNetworkError) {
        throw error;
      }
      if (isCancelledRequestError(error)) {
        throw new ApiError('Request cancelled', undefined, undefined, false, false, true);
      }

      if (__DEV__) console.log('Error caught in base.api.ts request method:', error);

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
      const errorMessage = getErrorMessage(error);

      if (
        errorMessage === 'Network request failed' ||
        isTransientNetworkError(error) ||
        isOffline
      ) {
        const networkError = new ApiError(
          isOffline
            ? 'No internet connection. Please check your network and try again.'
            : 'The network connection was interrupted. Please try again.',
          undefined,
          {
            originalError: getErrorMessage(error),
          },
          true,
        );

        throw networkError;
      }

      // Re-throw ApiError instances (already reported)
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap unknown errors and report to Sentry
      const unknownError = new ApiError(
        errorMessage || 'An unexpected error occurred',
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
    } finally {
      if (requestId && requestToken && this.requestTokens.get(requestId) === requestToken) {
        this.requestTokens.delete(requestId);
      }
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
    this.requestTokens.forEach(token => this.cancelRequestToken(token));
    this.requestTokens.clear();
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
        if (__DEV__) console.log(`Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const apiClient = ApiClient.getInstance();
