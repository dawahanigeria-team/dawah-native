import PostHog from 'posthog-react-native'
import { ENV } from '../../config/env'
import {
  isCancelledRequestError,
  isTransientNetworkError,
} from '../api/networkErrors'

let posthogInstance: PostHog | null = null

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

export const capturePostHogException = (
  error: Error | unknown,
  context?: Record<string, string | number | boolean | null>,
): void => {
  if (isBenignError(error)) return

  const posthog = getPostHog()
  if (!posthog) return

  posthog.captureException(error, context)
}
