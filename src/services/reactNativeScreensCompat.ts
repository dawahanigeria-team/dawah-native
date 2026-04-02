import { Platform } from 'react-native'

export type OptionalBooleanNativeProp = 'undefined' | 'false' | 'true'

export const getCompatFullScreenSwipeEnabledProp = (
  value: boolean | undefined,
  platform: string = Platform.OS
): OptionalBooleanNativeProp | undefined => {
  // `fullScreenSwipeEnabled` is an iOS-only prop. Some installed Android 1.0.0
  // binaries still expect the legacy boolean native type, while the newer JS
  // bundle serializes it as the string union below. Omitting it on Android keeps
  // OTA updates compatible with those older native modules.
  if (platform !== 'ios') {
    return undefined
  }

  if (value === undefined) {
    return 'undefined'
  }

  return value ? 'true' : 'false'
}
