import NetInfo from '@react-native-community/netinfo'
import { captureSentryException } from './config/sentry.config'
import { reportPlaybackError } from './playbackErrorReport'

jest.mock('./config/sentry.config', () => ({
  addSentryBreadcrumb: jest.fn(),
  captureSentryException: jest.fn(),
}))

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}))

const online = { isConnected: true, isInternetReachable: true }

beforeEach(() => {
  jest.clearAllMocks()
  ;(NetInfo.fetch as jest.Mock).mockResolvedValue(online)
})

test('a source failure while online is reported with the track and native message', async () => {
  await reportPlaybackError({ code: 'audio-source-error', message: 'Source error' }, '182290')

  expect(captureSentryException).toHaveBeenCalledTimes(1)
  const [error, context] = (captureSentryException as jest.Mock).mock.calls[0]
  expect(error.message).toBe('TrackPlayer playback error')
  expect(context).toEqual({
    component: 'AudioProvider',
    action: 'playbackError',
    trackId: '182290',
    errorCode: 'audio-source-error',
    errorMessage: 'Source error',
    level: 'error',
  })
})

test('a queue fault is reported even while offline', async () => {
  ;(NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false, isInternetReachable: false })

  await reportPlaybackError({ code: 'index-out-of-bounds', message: 'Track index 3 is out of bounds' }, '1')

  expect(captureSentryException).toHaveBeenCalledTimes(1)
})
