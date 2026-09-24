import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as Notifications from 'expo-notifications';
import { useNotificationObserver } from './useNotificationObserver';

jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'default',
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn(),
}));
jest.mock('../services/notifications.service', () => ({
  getNotificationRouteFromData: (data: { url?: string }) => data.url ?? null,
}));
let testSession = 0;
const response = (id: string) => ({
  actionIdentifier: 'default',
  notification: { date: 123, request: { identifier: `${testSession}:${id}`, content: { data: { url: `/lecture/${id}` } } } },
}) as unknown as Notifications.NotificationResponse;
function Observer({ navigate }: { navigate: (route: string, source: string) => void }) {
  useNotificationObserver(navigate);
  return null;
}
let root: TestRenderer.ReactTestRenderer;
let listener: (response: Notifications.NotificationResponse) => void;
const remove = jest.fn();
beforeEach(() => {
  testSession++;
  jest.clearAllMocks();
  (Notifications.clearLastNotificationResponseAsync as jest.Mock).mockResolvedValue(undefined);
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue(response('1'));
  (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(fn => {
    listener = fn;
    return { remove };
  });
});
afterEach(() => { if (root) act(() => root.unmount()); });
test('Back and Home renders never replay the last notification; a new tap still works', async () => {
  const first = jest.fn();
  await act(async () => { root = TestRenderer.create(<Observer navigate={first} />); });
  expect(first).toHaveBeenCalledTimes(1);
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  const afterBack = jest.fn();
  await act(async () => { root.update(<Observer navigate={afterBack} />); });
  expect(afterBack).not.toHaveBeenCalled();
  expect(Notifications.getLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  act(() => listener(response('1')));
  expect(afterBack).not.toHaveBeenCalled();
  act(() => listener(response('2')));
  expect(afterBack).toHaveBeenCalledWith('/lecture/2', 'notification');
});
test('a live response takes precedence over a delayed launch response', async () => {
  let resolve!: (value: Notifications.NotificationResponse) => void;
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockReturnValue(new Promise(r => { resolve = r; }));
  const navigate = jest.fn();
  await act(async () => { root = TestRenderer.create(<Observer navigate={navigate} />); });
  act(() => listener(response('2')));
  await act(async () => resolve(response('1')));
  expect(navigate.mock.calls).toEqual([['/lecture/2', 'notification']]);
});
test('an unmounted observer cannot navigate when initial lookup completes', async () => {
  let resolve!: (value: Notifications.NotificationResponse) => void;
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockReturnValue(new Promise(r => { resolve = r; }));
  const navigate = jest.fn();
  await act(async () => { root = TestRenderer.create(<Observer navigate={navigate} />); });
  act(() => root.unmount());
  await act(async () => resolve(response('1')));
  expect(navigate).not.toHaveBeenCalled();
  expect(remove).toHaveBeenCalled();
});

test('Back stays on Home even when a duplicate arrives after the old 1.5s debounce window', async () => {
  let path = '/';
  const navigate = jest.fn((route: string) => { path = route; });
  await act(async () => { root = TestRenderer.create(<Observer navigate={navigate} />); });
  expect(path).toBe('/lecture/1');
  path = '/'; // The user presses Back after reading the lecture.
  const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60000);
  try {
    await act(async () => {
      root.update(<Observer navigate={(route) => navigate(route)} />);
      listener(response('1'));
    });
    expect(path).toBe('/');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
    act(() => listener(response('2')));
    expect(path).toBe('/lecture/2');
  } finally { clock.mockRestore(); }
});

test('a root remount does not reopen a consumed notification when native clearing fails', async () => {
  (Notifications.clearLastNotificationResponseAsync as jest.Mock).mockRejectedValue(new Error('native clear failed'));
  const navigate = jest.fn();
  await act(async () => { root = TestRenderer.create(<Observer navigate={navigate} />); });
  expect(navigate).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
  await act(async () => { root = TestRenderer.create(<Observer navigate={navigate} />); });
  expect(navigate).toHaveBeenCalledTimes(1);
  act(() => listener(response('2')));
  expect(navigate).toHaveBeenCalledTimes(2);
});

test('warm-app tap is not stacked twice and a new upload of the same lecturer still opens', async () => {
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue(null);
  const navigate = jest.fn();
  await act(async () => { root = TestRenderer.create(<Observer navigate={navigate} />); });
  act(() => { listener(response('1')); listener(response('1')); });
  expect(navigate.mock.calls).toEqual([['/lecture/1', 'notification']]);
  act(() => listener(response('2')));
  expect(navigate.mock.calls).toEqual([['/lecture/1', 'notification'], ['/lecture/2', 'notification']]);
});
