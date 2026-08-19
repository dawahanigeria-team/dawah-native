export interface ListeningPreferences {
  languageIds: number[];
  lecturerIds: number[];
  configured: boolean;
  updatedAt?: string | null;
}

export const EMPTY_LISTENING_PREFERENCES: ListeningPreferences = {
  languageIds: [],
  lecturerIds: [],
  configured: false,
  updatedAt: null,
};

export const normalizePreferenceIds = (values: (number | string)[]): number[] =>
  Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );

export const hasListeningPreferences = (
  preferences: Pick<ListeningPreferences, "languageIds" | "lecturerIds">,
): boolean =>
  preferences.languageIds.length > 0 || preferences.lecturerIds.length > 0;
