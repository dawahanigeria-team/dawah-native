import {
  hasListeningPreferences,
  normalizePreferenceIds,
} from "./listeningPreferences.types";

test("normalizes positive preference IDs without duplicates", () => {
  expect(normalizePreferenceIds([6, "7", 6, 0, -1, "bad"])).toEqual([6, 7]);
});

test("treats either a language or a scholar as a configured feed", () => {
  expect(hasListeningPreferences({ languageIds: [6], lecturerIds: [] })).toBe(true);
  expect(hasListeningPreferences({ languageIds: [], lecturerIds: [42] })).toBe(true);
  expect(hasListeningPreferences({ languageIds: [], lecturerIds: [] })).toBe(false);
});
