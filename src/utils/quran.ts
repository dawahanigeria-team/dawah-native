import type { QuranRecitation } from '../services/api/quran.api';

const SURAH_NUMBER_PATTERNS = [
  /(?:^|\b)q(?:uran)?\s*[-_:]?\s*0*(\d{1,3})(?:\b|\s|-)/i,
  /(?:^|\b)surah\s*[-_:]?\s*0*(\d{1,3})(?:\b|\s|-)/i,
  /^\s*0*(\d{1,3})(?:\b|\s|-|\.)/,
];

export const getSurahNumber = (title: string, explicit?: number): number | undefined => {
  if (Number.isInteger(explicit) && Number(explicit) >= 1 && Number(explicit) <= 114) {
    return Number(explicit);
  }

  for (const pattern of SURAH_NUMBER_PATTERNS) {
    const match = title.match(pattern);
    const candidate = Number(match?.[1]);
    if (Number.isInteger(candidate) && candidate >= 1 && candidate <= 114) {
      return candidate;
    }
  }

  return undefined;
};

export const durationToSeconds = (duration: string | number | undefined): number => {
  if (typeof duration === 'number') {
    return Number.isFinite(duration) ? Math.max(0, duration) : 0;
  }
  if (!duration) return 0;

  if (/^\d+(?:\.\d+)?$/.test(duration.trim())) {
    return Math.max(0, Number(duration));
  }

  const parts = duration.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

export const sortRecitationsInQuranOrder = (
  recitations: QuranRecitation[],
): QuranRecitation[] => [...recitations]
  .sort((a, b) => {
    const aNumber = getSurahNumber(a.title, a.surahNumber);
    const bNumber = getSurahNumber(b.title, b.surahNumber);
    if (aNumber !== undefined && bNumber !== undefined) return aNumber - bNumber;
    if (aNumber !== undefined) return -1;
    if (bNumber !== undefined) return 1;
    return (a.trackNumber ?? Number.MAX_SAFE_INTEGER) - (b.trackNumber ?? Number.MAX_SAFE_INTEGER);
  })
  .map((recitation, index) => ({
    ...recitation,
    trackNumber: index + 1,
    surahNumber: getSurahNumber(recitation.title, recitation.surahNumber),
  }));
