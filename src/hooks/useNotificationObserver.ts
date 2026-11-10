import * as Notifications from 'expo-notifications';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { getNotificationRouteFromData } from '../services/notifications.service';

// Keep consumed responses for this JS session, including root remounts. Native
// cache clearing is asynchronous and may fail; a component-local set would let
// the same launch response reopen the lecture after Back in that window.
const handledResponses = new Set<string>();
const MAX_HANDLED_RESPONSES = 100;

/** Consume notification responses once, independently of navigation renders. */
export function useNotificationObserver(navigate: (route: string, source: string) => void) {
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    let receivedLiveResponse = false;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (cancelled || !response) return;
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const { notification } = response;
      const key = `${notification.request.identifier}:${notification.date}:${response.actionIdentifier}`;
      if (handledResponses.has(key)) return;
      const route = getNotificationRouteFromData(notification.request.content.data);
      if (!route) return;
      handledResponses.add(key);
      if (handledResponses.size > MAX_HANDLED_RESPONSES) {
        handledResponses.delete(handledResponses.values().next().value!);
      }
      navigateRef.current(route, 'notification');
      // Also consume the native cached response, so a later root remount or
      // ordinary launch does not replay a notification already opened.
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      receivedLiveResponse = true;
      handle(response);
    });
    void Notifications.getLastNotificationResponseAsync().then(response => {
      // A live tap that arrived while the initial lookup was pending wins.
      if (!receivedLiveResponse) handle(response);
    }).catch(() => {});
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
