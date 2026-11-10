import { resolveSearchFacets } from "./searchFacets";

test("no active filter keeps the plain search", () => {
  expect(resolveSearchFacets({ language: "All", surah: "All" })).toBeNull();
  expect(resolveSearchFacets({})).toBeNull();
});

test("language and scholar filters ask for lectures only", () => {
  expect(resolveSearchFacets({ language: "Hausa" })).toEqual({ contentType: "lecture" });
  expect(resolveSearchFacets({ lecturerId: "12" })).toEqual({ contentType: "lecture" });
});

test("a surah narrows the search with its name", () => {
  expect(resolveSearchFacets({ surah: "Al-Baqarah" })).toEqual({
    contentType: "lecture",
    phrase: "Baqara",
  });
});
