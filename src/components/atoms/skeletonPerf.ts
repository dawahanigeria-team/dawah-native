export const resolveSkeletonAnimationEnabled = (
  animated: boolean | undefined,
  _platform: string
): boolean => {
  if (typeof animated === "boolean") {
    return animated;
  }

  // Each shimmer drives a Fabric commit every frame; Home mounts many at once.
  // Static placeholders keep loading responsive on iOS as well as Android.
  return false;
};

export const getInitialSkeletonContainerWidth = (
  width: number | string
): number => {
  return typeof width === "number" ? width : 0;
};
