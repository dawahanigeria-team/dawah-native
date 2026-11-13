// Tabs page in 10 at a time, so the loaded length reads as the scholar's whole
// catalogue. The details endpoint already carries the real totals.
export const tabCount = (total: number | undefined, loaded: number): number =>
  Math.max(Number(total) || 0, loaded);
