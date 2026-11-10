import {
  getInitialSkeletonContainerWidth,
  resolveSkeletonAnimationEnabled,
} from "./skeletonPerf";

describe("skeletonPerf", () => {
  test("disables shimmer by default on Android", () => {
    expect(resolveSkeletonAnimationEnabled(undefined, "android")).toBe(false);
  });

  test("disables shimmer by default on iOS", () => {
    expect(resolveSkeletonAnimationEnabled(undefined, "ios")).toBe(false);
  });

  test("respects explicit animation override", () => {
    expect(resolveSkeletonAnimationEnabled(true, "android")).toBe(true);
    expect(resolveSkeletonAnimationEnabled(false, "ios")).toBe(false);
  });

  test("initial container width uses numeric width only", () => {
    expect(getInitialSkeletonContainerWidth(140)).toBe(140);
    expect(getInitialSkeletonContainerWidth("100%")).toBe(0);
  });
});
