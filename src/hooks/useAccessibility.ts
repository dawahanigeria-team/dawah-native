import { useCallback } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export const useAccessibility = () => {
  const announceForAccessibility = useCallback((message: string) => {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  const setAccessibilityFocus = useCallback((reactTag: number) => {
    if (Platform.OS === "ios") {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }, []);

  const isScreenReaderEnabled = useCallback(async () => {
    return await AccessibilityInfo.isScreenReaderEnabled();
  }, []);

  const addEventListener = useCallback(
    (event: string, handler: (enabled: boolean) => void) => {
      return AccessibilityInfo.addEventListener(event, handler);
    },
    []
  );

  const removeEventListener = useCallback(
    (event: string, handler: (enabled: boolean) => void) => {
      return AccessibilityInfo.removeEventListener(event, handler);
    },
    []
  );

  return {
    announceForAccessibility,
    setAccessibilityFocus,
    isScreenReaderEnabled,
    addEventListener,
    removeEventListener,
  };
};
