import { useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';

import {
  LastNavigation,
  NavigationTargetShape,
  navigationKey,
  shouldAllowNavigation,
} from './guardedNavigation';

/**
 * expo-router's own href type, so typed routes are still enforced at every
 * call site rather than being widened to `string` by this wrapper.
 */
type Href = Parameters<typeof router.push>[0];

/**
 * `router.push` that ignores a repeat of the same target inside the
 * duplicate-navigation window. Returns whether it navigated, so a
 * caller can skip side effects (analytics, haptics) on a swallowed tap.
 *
 * The guard is cleared whenever the screen regains focus, so coming back and
 * tapping the same card again always works, however fast.
 */
export function useGuardedPush(): (target: Href) => boolean {
  const lastRef = useRef<LastNavigation | null>(null);

  useFocusEffect(
    useCallback(() => {
      lastRef.current = null;
    }, []),
  );

  return useCallback((target: Href) => {
    const key = navigationKey(target as NavigationTargetShape);
    const now = Date.now();

    if (!shouldAllowNavigation(key, lastRef.current, now)) {
      return false;
    }

    lastRef.current = { key, at: now };
    router.push(target);
    return true;
  }, []);
}
