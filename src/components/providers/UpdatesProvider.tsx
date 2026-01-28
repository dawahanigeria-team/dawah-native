/**
 * Updates Provider
 * Checks for OTA updates on app launch and applies them automatically
 * Ensures users get the latest version without multiple restarts
 */

import * as Updates from 'expo-updates';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { addSentryBreadcrumb, captureSentryException } from '../../services/config/sentry.config';

interface UpdatesProviderProps {
  children: React.ReactNode;
}

export const UpdatesProvider: React.FC<UpdatesProviderProps> = ({ children }) => {
  const appState = useRef(AppState.currentState);
  const hasCheckedOnLaunch = useRef(false);

  useEffect(() => {
    // Only check for updates in production builds, not in development
    if (__DEV__) {
      return;
    }

    const checkForUpdates = async () => {
      try {
        if (!Updates.isEnabled) {
          addSentryBreadcrumb('Expo updates disabled, skipping check', 'info', {
            channel: Updates.channel,
            runtimeVersion: Updates.runtimeVersion,
          });
          return;
        }

        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          addSentryBreadcrumb('Offline, skipping update check', 'info', {
            isConnected: netState.isConnected,
            isInternetReachable: netState.isInternetReachable,
          });
          return;
        }

        addSentryBreadcrumb('Checking for updates', 'info', {
          channel: Updates.channel,
          runtimeVersion: Updates.runtimeVersion,
          isEnabled: Updates.isEnabled,
        });

        // Check if update is available
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          addSentryBreadcrumb('Update available, fetching...', 'info');

          // Download the update
          await Updates.fetchUpdateAsync();

          addSentryBreadcrumb('Update downloaded, reloading app', 'info');

          // Reload the app to apply the update immediately
          await Updates.reloadAsync();
        } else {
          addSentryBreadcrumb('No updates available', 'info');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isExpectedFailure =
          message.includes('Failed to check for update') ||
          message.includes('checkForUpdateAsync') ||
          message.includes('disabled');

        if (isExpectedFailure) {
          addSentryBreadcrumb('Update check failed', 'info', { message });
          return;
        }

        // Don't crash the app if update check fails
        captureSentryException(error as Error, {
          component: 'UpdatesProvider',
          action: 'checkForUpdates',
        });
      }
    };

    // Check for updates on initial app launch
    let timeout: NodeJS.Timeout | null = null;
    if (!hasCheckedOnLaunch.current) {
      hasCheckedOnLaunch.current = true;

      // Add small delay to not block app startup
      timeout = setTimeout(() => {
        checkForUpdates();
      }, 2000); // 2 second delay
    }

    // Also check when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        checkForUpdates();
      }
      appState.current = nextAppState;
    });

    // Cleanup both timeout and subscription
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      subscription.remove();
    };
  }, []);

  return <>{children}</>;
};
