import { getCompatFullScreenSwipeEnabledProp } from './reactNativeScreensCompat'

describe('reactNativeScreensCompat', () => {
  test('omits fullScreenSwipeEnabled on Android for OTA compatibility', () => {
    expect(getCompatFullScreenSwipeEnabledProp(undefined, 'android')).toBeUndefined()
    expect(getCompatFullScreenSwipeEnabledProp(false, 'android')).toBeUndefined()
    expect(getCompatFullScreenSwipeEnabledProp(true, 'android')).toBeUndefined()
  })

  test('preserves optional boolean string encoding on iOS', () => {
    expect(getCompatFullScreenSwipeEnabledProp(undefined, 'ios')).toBe('undefined')
    expect(getCompatFullScreenSwipeEnabledProp(false, 'ios')).toBe('false')
    expect(getCompatFullScreenSwipeEnabledProp(true, 'ios')).toBe('true')
  })
})
