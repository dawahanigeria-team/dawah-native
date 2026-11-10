import { shouldShowMiniPlayer } from "./miniPlayerVisibility";

describe("mini player visibility", () => {
  test("hidden on the welcome screen, shown on Home", () => {
    expect(shouldShowMiniPlayer("/", [])).toBe(false);
    expect(shouldShowMiniPlayer("/", ["(tabs)"])).toBe(true);
  });

  test.each([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/listening-preferences",
    "/lecture/123",
  ])("hidden on %s", (path) => {
    expect(shouldShowMiniPlayer(path, [path.slice(1)])).toBe(false);
  });

  test.each(["/library", "/profile", "/search", "/lecturer/9", "/premium"])(
    "shown on %s",
    (path) => {
      expect(shouldShowMiniPlayer(path, ["(tabs)"])).toBe(true);
    }
  );
});
