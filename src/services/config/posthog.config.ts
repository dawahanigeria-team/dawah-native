import PostHog from 'posthog-react-native'
import { ENV } from '../../config/env'
import {
  isCancelledRequestError,
  isTransientNetworkError,
} from '../api/networkErrors'

let posthogInstance: PostHog | null = null
let pendingFlush: Promise<void> | null = null

const ERROR_STACK_MAX_LENGTH = 4000

type PostHogExceptionProperties = NonNullable<
  Parameters<InstanceType<typeof PostHog>['captureException']>[1]
>

const toPostHogExceptionProperties = (
  context?: Record<string, unknown>,
): PostHogExceptionProperties | undefined => {
  if (!context) return undefined
  const out: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value
    } else {
      try {
        out[key] = JSON.stringify(value)
      } catch {
        out[key] = String(value)
      }
    }
  }
  return out as PostHogExceptionProperties
}

export const getPostHog = (): PostHog | null => {
  if (posthogInstance) return posthogInstance
  if (!ENV.POSTHOG_KEY) return null

  const disableRemoteConfigInDev = ENV.NODE_ENV === 'development'

  posthogInstance = new PostHog(ENV.POSTHOG_KEY, {
    host: ENV.POSTHOG_HOST,
    disableRemoteConfig: disableRemoteConfigInDev,
    errorTracking: {
      autocapture: {
        uncaughtExceptions: true,
        unhandledRejections: true,
        console: ['error'],
      },
    },
  })

  console.warn('[PostHog] Initialized', {
    key: ENV.POSTHOG_KEY.substring(0, 10) + '...',
    host: ENV.POSTHOG_HOST,
    disableRemoteConfig: disableRemoteConfigInDev,
    errorTracking: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: ['error'],
    },
  })

  return posthogInstance
}

const isBenignError = (error: unknown): boolean => {
  if (isCancelledRequestError(error)) return true
  if (isTransientNetworkError(error)) return true

  const statusCode = (error as { statusCode?: number } | null)?.statusCode
  if (statusCode && statusCode >= 400 && statusCode < 500) return true

  return false
}

const normalizeErrorForPostHog = (error: Error | unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack ? error.stack.slice(0, ERROR_STACK_MAX_LENGTH) : undefined,
      exception: error,
    }
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: undefined,
      exception: new Error(error),
    }
  }

  const message = (() => {
    try {
      return JSON.stringify(error) || 'Unknown error'
    } catch {
      return String(error ?? 'Unknown error')
    }
  })()

  return {
    name: 'Error',
    message,
    stack: undefined,
    exception: new Error(message),
  }
}

export const capturePostHogException = (
  error: Error | unknown,
  context?: Record<string, unknown>,
): void => {
  if (isBenignError(error)) return

  const posthog = getPostHog()
  if (!posthog) return

  const normalizedError = normalizeErrorForPostHog(error)
  const posthogProperties = toPostHogExceptionProperties(context)

  posthog.capture('app_error', {
    error_name: normalizedError.name,
    error_message: normalizedError.message,
    ...(normalizedError.stack ? { error_stack: normalizedError.stack } : {}),
    error_source: 'manual_capture',
    ...posthogProperties,
  })

  posthog.captureException(normalizedError.exception, posthogProperties)

  if (!pendingFlush) {
    pendingFlush = posthog.flush()
      .catch((flushError) => {
        console.warn('[PostHog] flush() failed after captureException', flushError)
      })
      .finally(() => {
        pendingFlush = null
      })
  }
}
