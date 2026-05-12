import { resolveFavoriteIdsForLoad } from "./resolveFavoriteIdsForLoad";

describe("resolveFavoriteIdsForLoad", () => {
  test("uses current favorite IDs when available", async () => {
    const fetchFavorites = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValue(["x", "y"]);

    const result = await resolveFavoriteIdsForLoad(["a", "b"], fetchFavorites);

    expect(result).toEqual(["a", "b"]);
    expect(fetchFavorites).not.toHaveBeenCalled();
  });

  test("uses fetched favorite IDs when current list is empty", async () => {
    const fetchFavorites = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValue(["id-1", "id-2"]);

    const result = await resolveFavoriteIdsForLoad([], fetchFavorites);

    expect(fetchFavorites).toHaveBeenCalledTimes(1);
    expect(result).toEqual(["id-1", "id-2"]);
  });
});
