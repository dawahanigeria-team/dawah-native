const BANNER_TOP_OFFSET = 8;
const BANNER_MIN_TOP = 16;

export const getUpdatesBannerTop = (insetTop: number): number => {
  const safeTopInset = Number.isFinite(insetTop) ? insetTop : 0;
  return Math.max(safeTopInset + BANNER_TOP_OFFSET, BANNER_MIN_TOP);
};
