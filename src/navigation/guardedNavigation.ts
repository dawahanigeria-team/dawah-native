/**
 * Guards against a route being pushed twice in quick succession.
 *
 * `router.push` always stacks a new entry — it never dedupes by href — so a
 * double tap on a card mounts the destination screen twice. Both copies fetch
 * the same URLs, and `base.api` cancels an in-flight request whenever another
 * with the same `requestId` (`GET_<full url>`) starts. The copy on top wins and
 * looks fine; the buried copy is left with an aborted request, and the user
 * meets it when they press back.
 */

/**
 * Long enough to swallow a double tap (a deliberate second tap lands well
 * after the push animation has covered the card that was tapped), short enough
 * that it can never block navigation the user actually meant.
 */
export const DUPLICATE_NAVIGATION_WINDOW_MS = 800;

export interface LastNavigation {
  key: string;
  at: number;
}

/**
 * Structural shape of the href forms expo-router accepts. Deliberately looser
 * than expo-router's `Href` so this stays a pure, testable helper — callers are
 * typed against `Href` itself, so typed routes are still enforced at the call
 * site.
 */
export type NavigationTargetShape =
  | string
  | {
      pathname?: unknown;
      params?: Record<string, unknown> | null;
    };

/**
 * Collapses either href form to one comparable string. Params are sorted so
 * that two objects meaning the same route always produce the same key.
 */
export function navigationKey(target: NavigationTargetShape): string {
  if (typeof target === 'string') return target;

  const pathname = String(target.pathname ?? '');
  const params = target.params;
  if (!params) return pathname;

  const query = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');

  return query ? `${pathname}?${query}` : pathname;
}

export function shouldAllowNavigation(
  key: string,
  last: LastNavigation | null,
  now: number,
  windowMs: number = DUPLICATE_NAVIGATION_WINDOW_MS,
): boolean {
  if (!last) return true;
  if (last.key !== key) return true;

  const elapsed = now - last.at;

  // A negative elapsed means the wall clock moved backwards (NTP correction,
  // the user changing the device time). Allowing the navigation is the safe
  // reading: a blocked tap that the user meant is worse than a rare duplicate.
  if (elapsed < 0) return true;

  return elapsed >= windowMs;
}
