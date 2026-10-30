/**
 * Base API Client
 * Handles all HTTP requests with retry logic, error handling, and caching
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG } from '../config/api.config';
import { Sentry, captureSentryException, addSentryBreadcrumb } from '../config/sentry.config';
import { secureStoreCompat } from '../storage/secureStoreCompat';
import {
  getApiErrorText,
  isExpectedUserInputRefusal,
  isInvalidOrExpiredTokenMessage,
} from '../config/sentry.filters';
import {
  getErrorMessage,
  isCancelledRequestError,
  isTransientNetworkError,
  isTransientNetworkErrorText,
} from './networkErrors';

const SLOW_API_REQUEST_THRESHOLD_MS = 2000;

// A user-facing GET must reach a retry state quickly on a dead connection.
// Without a cap a 60 s timeout times 3 attempts keeps a spinner up for minutes.
const GET_ATTEMPT_TIMEOUT_CAP_MS = 20000;
const GET_MAX_ATTEMPTS = 2;

/**
 * Why a token refresh did not produce a usable session.
 *
 * `rejected` means the credentials themselves are finished - no refresh token
 * stored, or the server refused the one we had - so the session is genuinely
 * over. `unavailable` means we never got an answer: offline, timed out, or
 * secure storage failed. Collapsing the two logs people out of a working
 * account over one bad request, and tells them to sign in when the real
 * advice is to try again.
 */
export type TokenRefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

// Custom error class for API errors
export class ApiError extends Error {
  /** Set when this error survived a token refresh attempt. */
  public refreshOutcome?: TokenRefreshOutcome;

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
  /**
   * This request is expected to be refused when the credentials are finished -
   * the token refresh itself. Its 401/403 is the session ending, which the
   * caller turns into a sign-out, so it is not a defect to report.
   */
  expectedAuthFailure?: boolean;
}

export const createTokenRefreshRetryConfig = (config: RequestConfig): RequestConfig => {
  const { signal: _signal, ...retryConfig } = config;
  return { ...retryConfig, skipTokenRefresh: true };
};

export const isMissingAccessTokenError = (errorData: any): boolean => {
  const text = String(errorData?.message || errorData?.error || '').toLowerCase();
  return text.includes('access token') && text.includes('required');
};

export const normalizeAuthToken = (token: string | null | undefined): string | null => {
  if (typeof token !== 'string') {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') {
    return null;
  }

  return trimmed;
};

export const shouldCaptureApiHttpError = (
  statusCode: number,
  errorData: any,
  _hasAuthToken: boolean,
  refreshOutcome?: TokenRefreshOutcome,
  expectedAuthFailure = false,
  afterTokenRefreshRetry = false,
): boolean => {
  // The refresh endpoint refusing our credentials is the session ending, and
  // it is refused with whatever wording that endpoint uses - so this cannot be
  // recognised from the message the way a missing access token can.
  if (expectedAuthFailure && (statusCode === 401 || statusCode === 403)) return false;
  // The download screen handles this structured business refusal with the
  // premium prompt; retain reporting for every other forbidden response.
  if (statusCode === 403 && errorData?.code === 'DOWNLOAD_LIMIT_REACHED') return false;
  const errorText = getApiErrorText(errorData);
  // A wrong password or a duplicate signup is the user's situation, not a
  // defect, whatever else is going on with the session.
  if (isExpectedUserInputRefusal(statusCode, errorText)) return false;
  if (statusCode !== 401) return true;
  // We refreshed, retried, and the server still rejects the token: the session
  // is genuinely over. On a *first* attempt the same message is not expected -
  // it means we sent a token we should have refreshed - so that keeps reporting.
  if (afterTokenRefreshRetry && isInvalidOrExpiredTokenMessage(errorText)) return false;
  // A refresh the server refused is expected too. `unavailable` is still
  // reported: that one is a real anomaly and does not end the session.
  return !(isMissingAccessTokenError(errorData) || refreshOutcome === 'rejected');
};

/**
 * The tokens from a refresh response, or null if the server did not actually
 * give us a usable pair.
 *
 * A 200 carrying a blank or missing token is not a refreshed session. Taking
 * it at face value writes junk over stored credentials and - because
 * setAuthToken normalises a blank token to null - quietly clears the token we
 * still had, while reporting success.
 */
export const readRefreshedTokens = (
  payload: any,
): { accessToken: string; refreshToken: string } | null => {
  const accessToken = normalizeAuthToken(payload?.data?.tokens?.access_token);
  const refreshToken = normalizeAuthToken(payload?.data?.tokens?.refresh_token);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
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
  /** In-flight GETs, so concurrent identical reads share one network request. */
  private inFlightGets: Map<string, Promise<ApiResponse<any>>> = new Map();
  private requestTokens: Map<string, RequestToken> = new Map();
  private activeRequests = 0;
  private authToken: string | null = null;
  private authTokenHydrationPromise: Promise<void> | null = null;
  private hasHydratedAuthToken = false;
  private _authTokenChangeListener: ((token: string | null) => void) | null = null;
  private _refreshPromise: Promise<TokenRefreshOutcome> | null = null;
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
        const accessToken = normalizeAuthToken(await secureStoreCompat.getItemAsync('access_token'));
        token = accessToken ?? normalizeAuthToken(await secureStoreCompat.getItemAsync('auth_token'));
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
    const normalizedToken = normalizeAuthToken(token);
    this.authToken = normalizedToken;
    this.hasHydratedAuthToken = true;
    this._authTokenChangeListener?.(normalizedToken);
    if (typeof window === 'undefined') return;
    try {
      if (normalizedToken) {
        await secureStoreCompat.setItemAsync('auth_token', normalizedToken);
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

  private async refreshAccessToken(): Promise<TokenRefreshOutcome> {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      let refreshToken: string | null;
      try {
        refreshToken = await secureStoreCompat.getItemAsync('refresh_token');
      } catch {
        // Storage read failed. We do not know whether the session is still
        // good, and guessing 'over' signs the user out for a disk hiccup.
        return 'unavailable';
      }
      // Nothing to refresh with: the session really is finished.
      if (!refreshToken) return 'rejected';

      try {
        const response = await this.request<{
          data: { tokens: { access_token: string; refresh_token: string } };
        }>('/api/user_auth.php', {
          method: 'POST',
          body: JSON.stringify({ action: 'refresh_token', refresh_token: refreshToken }),
          skipTokenRefresh: true,
          retry: false,
          expectedAuthFailure: true,
        });

        const tokens = readRefreshedTokens(response.data);
        // A 200 without a usable pair is a server defect, not proof the session
        // ended - so leave the credentials we still have alone and say so.
        if (!tokens) return 'unavailable';

        await this.setAuthToken(tokens.accessToken);
        await secureStoreCompat.setItemAsync('access_token', tokens.accessToken);
        await secureStoreCompat.setItemAsync('refresh_token', tokens.refreshToken);
        await secureStoreCompat.setItemAsync('auth_token', tokens.accessToken);
        return 'refreshed';
      } catch (error) {
        // Only the server refusing the refresh token ends the session. Anything
        // else - offline, timeout, a shape we did not expect - leaves it unknown.
        const status = error instanceof ApiError ? error.statusCode : undefined;
        return status === 401 || status === 403 ? 'rejected' : 'unavailable';
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
   * Aborts a response whose body is still downloading. fetch() resolves at the
   * headers, after the request timer is gone, so the body needs its own.
   */
  private bodyAborters = new WeakMap<Response, () => void>();

  private isGetConfig(config: RequestConfig): boolean {
    return (config.method || 'GET').toUpperCase() === 'GET';
  }

  private attemptTimeoutMs(config: RequestConfig): number {
    const timeout = config.timeout || API_CONFIG.TIMEOUTS.DEFAULT;
    return this.isGetConfig(config)
      ? Math.min(timeout, GET_ATTEMPT_TIMEOUT_CAP_MS)
      : timeout;
  }

  private maxAttempts(config: RequestConfig): number {
    const attempts = config.retryAttempts || API_CONFIG.RETRY.MAX_ATTEMPTS;
    return this.isGetConfig(config) ? Math.min(attempts, GET_MAX_ATTEMPTS) : attempts;
  }

  private async readBodyWithTimeout(
    response: Response,
    timeoutMs: number,
  ): Promise<string> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        this.bodyAborters.get(response)?.();
        reject(
          new ApiError(
            'The request is taking longer than usual. Please check your internet connection and try again.',
            undefined,
            undefined,
            false,
            true,
          ),
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([response.text(), timedOut]);
    } finally {
      clearTimeout(timer);
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
      this.bodyAborters.set(response, () => abortController.abort());
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
    const maxAttempts = this.maxAttempts(config);
    const timeout = this.attemptTimeoutMs(config);

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
  /**
   * De-duplicates concurrent identical GETs.
   *
   * Two components mounting together ask for the same URL, both miss the cache
   * because the read is async and neither has written yet, and both go to the
   * network. Measured on a first launch: 30 requests for 15 distinct URLs.
   *
   * Worse than the wasted bytes, `createRequestToken` cancels any in-flight
   * request with the same id, so the second caller was cancelling the first.
   * A cancelled request surfaces as an empty result, which is how a populated
   * screen ends up rendering "nothing found".
   *
   * Joining the in-flight promise fixes both: one network request, one result,
   * no cancellation. Only GETs — a POST is not safe to share, two callers
   * posting the same body still mean two intended writes.
   */
  public async request<T = any>(
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const method = (config.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      return this.performRequest<T>(endpoint, config);
    }

    // The cache setting is part of the key so a caller that explicitly asked to
    // bypass the cache never joins one that did not, and vice versa.
    const key = `${method}_${this.buildUrl(endpoint, config.params)}_${
      config.useCache === false ? 'fresh' : 'cached'
    }`;

    const existing = this.inFlightGets.get(key);
    if (existing) {
      return existing as Promise<ApiResponse<T>>;
    }

    const pending = this.performRequest<T>(endpoint, config).finally(() => {
      this.inFlightGets.delete(key);
    });
    this.inFlightGets.set(key, pending as Promise<ApiResponse<any>>);
    return pending;
  }

  private async performRequest<T = any>(
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    // Define these outside try block so they're available in catch
    const telemetryMethod = (config.method || 'GET').toUpperCase();
    const requestStartedAtMs = Date.now();
    const requestSpan = Sentry.startInactiveSpan({
      name: `${telemetryMethod} ${endpoint}`,
      op: 'http.client',
      forceTransaction: true,
      attributes: {
        'http.request.method': telemetryMethod,
        'http.route': endpoint,
      },
    });
    let statusCodeForTelemetry: number | null = null;
    let usedCache = false;
    let failed = false;
    let suppressSentryFailureTelemetry = false;
    let url = '';
    let method = '';
    let requestId = '';
    let requestToken: RequestToken | null = null;

    try {
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
          usedCache = true;
          statusCodeForTelemetry = 200;
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

      // Cached reads do not consume network capacity or wait behind requests.
      await this.enforceRateLimit();

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
      statusCodeForTelemetry = response.status;

      if (__DEV__) {
        console.log('📡 HTTP Response:', {
          url,
          status: response.status,
          ok: response.ok,
        });
      }

      const responseText = await this.readBodyWithTimeout(
        response,
        this.attemptTimeoutMs(requestConfig),
      );
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
        let refreshOutcome: TokenRefreshOutcome | undefined;

        if (
          response.status === 401 &&
          !config.skipTokenRefresh &&
          this.authToken &&
          this.isExpiredTokenError(errorData)
        ) {
          refreshOutcome = await this.refreshAccessToken();
          if (refreshOutcome === 'refreshed') {
            // Retry beneath GET deduplication: the public request is still pending
            // and joining it here would make it wait on itself forever.
            return this.performRequest<T>(endpoint, createTokenRefreshRetryConfig(config));
          }
          // Only tear the session down when the server actually refused the
          // refresh token. On 'unavailable' the credentials may be perfectly
          // good and we simply could not reach anyone to ask.
          if (refreshOutcome === 'rejected') {
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
        // Carried on the error so callers can tell an ended session from a
        // refresh we could not complete - they mean different things to the user.
        apiError.refreshOutcome = refreshOutcome;
        failed = true;

        const shouldReportToSentry = shouldCaptureApiHttpError(
          response.status,
          errorData,
          !!this.authToken,
          refreshOutcome,
          config.expectedAuthFailure,
          config.skipTokenRefresh,
        );
        suppressSentryFailureTelemetry = !shouldReportToSentry;

        if (shouldReportToSentry) {
          captureSentryException(apiError, {
            endpoint,
            method,
            url,
            statusCode: response.status,
            errorData,
          });
        } else {
          // Kept as a breadcrumb so a later, real error still shows the auth
          // state that preceded it - without filing an issue of its own.
          addSentryBreadcrumb('Expected API refusal', 'api.auth', {
            endpoint,
            statusCode: response.status,
            refreshOutcome,
          });
        }

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
      failed = true;
      if (typeof error?.statusCode === 'number') {
        statusCodeForTelemetry = error.statusCode;
      }
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
      const durationMs = Date.now() - requestStartedAtMs;
      requestSpan.setAttributes({
        'http.request.method': telemetryMethod,
        'http.route': endpoint,
        'http.request.duration_ms': durationMs,
        'app.api.cached': usedCache,
        'app.api.failed': failed,
      });
      if (statusCodeForTelemetry !== null) {
        requestSpan.setAttribute('http.response.status_code', statusCodeForTelemetry);
      }
      requestSpan.end();

      Sentry.metrics.count('api_request_total', 1, {
        attributes: {
          endpoint,
          method: telemetryMethod,
          status_code: statusCodeForTelemetry ?? 'unknown',
          cached: usedCache,
          failed,
        },
      });
      Sentry.metrics.distribution('api_request_duration', durationMs, {
        unit: 'millisecond',
        attributes: {
          endpoint,
          method: telemetryMethod,
          status_code: statusCodeForTelemetry ?? 'unknown',
          cached: usedCache,
          failed,
        },
      });

      if (failed && !suppressSentryFailureTelemetry) {
        Sentry.logger.warn('API request failed', {
          endpoint,
          method: telemetryMethod,
          status_code: statusCodeForTelemetry ?? 'unknown',
          duration_ms: durationMs,
          cached: usedCache,
        });
      } else if (durationMs >= SLOW_API_REQUEST_THRESHOLD_MS) {
        Sentry.logger.info('Slow API request', {
          endpoint,
          method: telemetryMethod,
          status_code: statusCodeForTelemetry ?? 'unknown',
          duration_ms: durationMs,
          cached: usedCache,
        });
      }

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
        // expo-sqlite multiRemove opens an exclusive transaction on a second
        // connection. It races playback/auth writes during logout (Sentry 3X).
        // Use the shared connection and yield between individual deletions.
        for (const key of cacheKeys) {
          await AsyncStorage.removeItem(key);
        }
        if (__DEV__) console.log(`Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const apiClient = ApiClient.getInstance();
