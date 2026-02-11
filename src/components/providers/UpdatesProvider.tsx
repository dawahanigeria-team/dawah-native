import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../utils/logger';
import { captureSentryException, addSentryBreadcrumb } from '../../services/config/sentry.config';
import { useTheme } from '../../hooks/useTheme';
import { getLastCheckAfterAttempt, shouldThrottleUpdateCheck } from './UpdatesProvider.checks';
import {
  getDismissedUpdateId,
  getUpdateIdFromManifest,
  isDismissedUpdate,
  setDismissedUpdateId,
} from './UpdatesProvider.dismissal';
import { getUpdatesBannerTop } from './UpdatesProvider.layout';

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export const UpdatesProvider: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [updateReady, setUpdateReady] = useState(false);
  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);
  const pendingUpdateIdRef = useRef<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__) return;
    if (checkingRef.current) return;

    const now = Date.now();
    const previousLastCheckMs = lastCheckRef.current;
    if (shouldThrottleUpdateCheck(now, previousLastCheckMs, CHECK_INTERVAL_MS)) return;

    checkingRef.current = true;
    let attemptSucceeded = false;

    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        pendingUpdateIdRef.current = null;
        attemptSucceeded = true;
        return;
      }
      const availableUpdateId = getUpdateIdFromManifest(result.manifest);
      try {
        const dismissedUpdateId = await getDismissedUpdateId();
        if (isDismissedUpdate(availableUpdateId, dismissedUpdateId)) {
          pendingUpdateIdRef.current = null;
          attemptSucceeded = true;
          return;
        }
      } catch (storageError) {
        captureSentryException(storageError as Error, { action: 'read_update_banner_dismissal' });
      }

      logger.debug('OTA update available, downloading...');
      addSentryBreadcrumb('OTA update available', 'updates');

      await Updates.fetchUpdateAsync();
      pendingUpdateIdRef.current = availableUpdateId;
      setUpdateReady(true);
      logger.debug('OTA update downloaded, ready to reload');
      attemptSucceeded = true;
    } catch (error) {
      captureSentryException(error as Error, { action: 'check_for_update' });
    } finally {
      lastCheckRef.current = getLastCheckAfterAttempt({
        previousLastCheckMs,
        nowMs: now,
        attemptSucceeded,
      });
      checkingRef.current = false;
    }
  }, []);

  // Check on mount
  useEffect(() => {
    if (__DEV__) return;
    checkForUpdate();
  }, [checkForUpdate]);

  // Check when app returns from background
  useEffect(() => {
    if (__DEV__) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkForUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkForUpdate]);

  const handleReload = useCallback(async () => {
    addSentryBreadcrumb('User accepted OTA update', 'updates');
    try {
      await Updates.reloadAsync();
    } catch (error) {
      captureSentryException(error as Error, { action: 'reload_after_update' });
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setUpdateReady(false);
    const pendingUpdateId = pendingUpdateIdRef.current;
    if (!pendingUpdateId) {
      return;
    }
    void setDismissedUpdateId(pendingUpdateId).catch((error) => {
      captureSentryException(error as Error, {
        action: 'persist_update_banner_dismissal',
        updateId: pendingUpdateId,
      });
    });
  }, []);

  if (!updateReady) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.banner, { top: getUpdatesBannerTop(insets.top) }]}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerText}>A new version is available</Text>
        <View style={styles.bannerActions}>
          <Pressable onPress={handleDismiss} hitSlop={8}>
            <Text style={styles.dismissText}>Later</Text>
          </Pressable>
          <Pressable
            onPress={handleReload}
            style={[styles.reloadButton, { backgroundColor: colors.brand.primary }]}
            hitSlop={8}
          >
            <Text style={[styles.reloadText, { color: colors.fixed.black }]}>Update</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  dismissText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
  reloadButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reloadText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
