import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import {
    registerForPushNotificationsAsync,
    updatePushTokenAsync,
} from '../services/notifications.service';

const STARTUP_PUSH_REGISTRATION_DELAY_MS = 1500;

export const usePushNotifications = (): void => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let registrationTimeout: ReturnType<typeof setTimeout> | null = null;
    const idleTask = requestIdleCallback(() => {
      registrationTimeout = setTimeout(() => {
        // Root startup may refresh an existing opt-in, but permission prompts
        // belong to the notification settings flow where the user has context.
        registerForPushNotificationsAsync({ requestPermission: false }).catch(() => {
          // Notification registration can fail on some Android devices —
          // swallow to prevent an unhandled-rejection crash.
        });
      }, STARTUP_PUSH_REGISTRATION_DELAY_MS);
    }, { timeout: 2000 });

    const tokenListener = Notifications.addPushTokenListener(token => {
      updatePushTokenAsync(token.data);
    });

    return () => {
      cancelIdleCallback(idleTask);
      if (registrationTimeout) {
        clearTimeout(registrationTimeout);
      }
      tokenListener.remove();
    };
  }, []);
};
