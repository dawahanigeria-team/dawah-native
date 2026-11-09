import { matchesSurah, surahNumberFromTitle } from "./surahSearch";

const title = "Q002 - Shaykh Abdullah Abba";

test("reads the surah number from catalogue titles", () => {
  expect(surahNumberFromTitle(title)).toBe(2);
  expect(surahNumberFromTitle("Surah Yusuf")).toBeUndefined();
});

test("finds a surah by number", () => {
  expect(matchesSurah(title, 2, "2")).toBe(true);
  expect(matchesSurah(title, 2, "20")).toBe(false);
});

test("finds a surah by name even when the title omits it", () => {
  expect(matchesSurah(title, 2, "baqarah")).toBe(true);
  expect(matchesSurah(title, 2, "Al-Baqara")).toBe(true);
  expect(matchesSurah(title, 2, "yusuf")).toBe(false);
});

test("an empty search matches everything", () => {
  expect(matchesSurah(title, 2, "  ")).toBe(true);
});
