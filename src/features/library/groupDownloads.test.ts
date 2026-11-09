import { groupDownloads, SINGLE_LECTURES } from "./groupDownloads";

const item = (id: string, seriesTitle: string | undefined, createdAt: string) => ({
  id,
  seriesTitle,
  createdAt,
});

test("groups downloads under their series, newest series first, singles last", () => {
  const result = groupDownloads([
    item("a", "Tafsir Surah Yusuf", "2026-11-01T00:00:00Z"),
    item("b", undefined, "2026-11-09T00:00:00Z"),
    item("c", "Riyadus Saliheen", "2026-11-05T00:00:00Z"),
    item("d", "Tafsir Surah Yusuf", "2026-11-02T00:00:00Z"),
  ]);

  expect(result.map((entry) => ("kind" in entry ? `# ${entry.title} (${entry.count})` : entry.id))).toEqual([
    "# Riyadus Saliheen (1)",
    "c",
    "# Tafsir Surah Yusuf (2)",
    "a",
    "d",
    `# ${SINGLE_LECTURES} (1)`,
    "b",
  ]);
});

test("leaves a list with no series ungrouped", () => {
  const downloads = [item("a", undefined, "2026-11-01T00:00:00Z"), item("b", "", "2026-11-02T00:00:00Z")];

  expect(groupDownloads(downloads)).toEqual(downloads);
});
