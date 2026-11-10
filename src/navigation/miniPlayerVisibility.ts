const HIDDEN_PREFIXES = [
  "/lecture/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/listening-preferences",
];

// The welcome screen (app/index.tsx) and Home (app/(tabs)/index.tsx) both
// resolve to pathname "/", so only the "(tabs)" group segment tells them apart.
export function shouldShowMiniPlayer(pathname: string, segments: readonly string[]): boolean {
  if (pathname === "/" && segments[0] !== "(tabs)") return false;
  return !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
