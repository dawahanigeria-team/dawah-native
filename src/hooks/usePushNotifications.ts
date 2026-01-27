import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import {
    registerForPushNotificationsAsync,
    updatePushTokenAsync,
} from '../services/notifications.service';

export const usePushNotifications = (): void => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    registerForPushNotificationsAsync();

    const tokenListener = Notifications.addPushTokenListener(token => {
      updatePushTokenAsync(token.data);
    });

    return () => {
      tokenListener.remove();
    };
  }, []);
};
