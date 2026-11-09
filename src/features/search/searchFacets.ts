import { surahSearchPhrase } from "../quran/surahSearch";

interface FacetInput {
  language?: string;
  lecturerId?: string;
  surah?: string;
}

export interface SearchFacets {
  contentType: "lecture";
  phrase?: string;
}

/**
 * The search API applies language and scholar filters only in its unified
 * (`type=all`) mode, and has no surah field, so a surah narrows the text search
 * with a quoted phrase instead. Returns null when no filter is active.
 */
export const resolveSearchFacets = (filters: FacetInput): SearchFacets | null => {
  const hasSurah = Boolean(filters.surah) && filters.surah !== "All";
  const hasLanguage = Boolean(filters.language) && filters.language !== "All";
  if (!hasSurah && !hasLanguage && !filters.lecturerId) return null;

  return {
    contentType: "lecture",
    ...(hasSurah ? { phrase: surahSearchPhrase(filters.surah as string) } : {}),
  };
};
