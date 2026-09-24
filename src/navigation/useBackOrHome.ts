import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/** Keep normal Back behavior; direct-entry screens must still have an exit. */
export function useBackOrHome() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);
}
