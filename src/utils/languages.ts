// Authoritative source: /api/all_lang_api.php (see languages.api.ts).
// Kept as a fallback for offline/error paths only. Fulani was previously
// listed at id=5 based on a guess — backend confirms no such language;
// the endpoint returns an empty array for that id.
export const LANGUAGE_MAP: Record<string, number> = {
  'Arabic': 157,
  'Ebira': 877,
  'English': 6,
  'Hausa': 8,
  'Igala': 50041,
  'Igbo': 9,
  'Nupe': 53181,
  'Pidgin English': 46504,
  'Yoruba': 7,
};

// Reverse map for ID to Name lookups
export const LANGUAGE_ID_MAP: Record<number, string> = Object.entries(LANGUAGE_MAP).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as Record<number, string>);

export const getLanguageId = (name?: string): number | undefined => {
  if (!name || name === 'All') return undefined;
  return LANGUAGE_MAP[name];
};

export const getLanguageName = (id?: number): string => {
  if (!id) return 'Unknown';
  return LANGUAGE_ID_MAP[id] || 'Unknown';
};
