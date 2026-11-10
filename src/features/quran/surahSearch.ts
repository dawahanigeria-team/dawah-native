import { surahs } from "../../data/surahs";

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    // Baqarah and Baqara are the same surah; catalogue spellings vary.
    .replace(/h$/, "");

/** Many recitations are titled only "Q002 - Reciter", so the number comes from the title. */
export const surahNumberFromTitle = (title: string): number | undefined => {
  const match = /^\s*Q\s*0*(\d+)/i.exec(title);
  return match ? Number(match[1]) : undefined;
};

/**
 * The most distinctive part of a surah's name, for matching catalogue text:
 * "Al-Baqarah" becomes "Baqara", which also finds the spelling "Baqarah".
 */
export const surahSearchPhrase = (name: string): string =>
  name.replace(/^(?:A[a-z]|Ali)-/, "").replace(/h$/, "");

export const matchesSurah = (
  title: string,
  number: number,
  query: string,
): boolean => {
  const trimmed = query.trim();
  if (!trimmed) return true;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) === number;

  const needle = normalize(trimmed);
  // `surahs[0]` is the "All" filter option, so surah numbers index it directly.
  const name = surahs[number];
  return (
    normalize(title).includes(needle) ||
    (name !== undefined && normalize(name).includes(needle))
  );
};
