export const resolveSkeletonAnimationEnabled = (
  animated: boolean | undefined,
  platform: string
): boolean => {
  if (typeof animated === "boolean") {
    return animated;
  }

  return platform !== "android";
};

export const getInitialSkeletonContainerWidth = (
  width: number | string
): number => {
  return typeof width === "number" ? width : 0;
};
