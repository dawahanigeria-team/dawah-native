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
  'Fulani': 5 // Assuming ID 5 based on common patterns or legacy data, but will comment out if unsure. Actually better to leave it undefined if unknown to fallback to default behavior which is better than wrong ID.
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
