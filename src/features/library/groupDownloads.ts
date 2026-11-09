export interface GroupableDownload {
  id: string;
  seriesTitle?: string;
  createdAt: string;
}

export interface DownloadGroupHeader {
  kind: "header";
  id: string;
  title: string;
  count: number;
}

export const SINGLE_LECTURES = "Single lectures";

/**
 * Downloads grouped under their series, newest series first, with lectures that
 * have no known series last. Downloads saved before series were recorded land
 * in that last group.
 */
export const groupDownloads = <T extends GroupableDownload>(
  downloads: readonly T[],
): (T | DownloadGroupHeader)[] => {
  const groups = new Map<string, T[]>();
  for (const download of downloads) {
    const title = download.seriesTitle?.trim() || SINGLE_LECTURES;
    groups.set(title, [...(groups.get(title) ?? []), download]);
  }

  const latest = (items: T[]) => Math.max(...items.map((item) => Date.parse(item.createdAt) || 0));
  const ordered = [...groups.entries()].sort(([a, itemsA], [b, itemsB]) => {
    if (a === SINGLE_LECTURES) return 1;
    if (b === SINGLE_LECTURES) return -1;
    return latest(itemsB) - latest(itemsA);
  });

  // With no series at all a lone header would only add noise.
  if (ordered.length === 1 && ordered[0][0] === SINGLE_LECTURES) return [...downloads];

  return ordered.flatMap(([title, items]) => [
    { kind: "header" as const, id: `header-${title}`, title, count: items.length },
    ...items,
  ]);
};
