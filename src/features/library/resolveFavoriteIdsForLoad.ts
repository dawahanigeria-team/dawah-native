export const resolveFavoriteIdsForLoad = async (
  currentFavoriteIds: string[],
  fetchFavorites: () => Promise<string[]>,
): Promise<string[]> => {
  if (currentFavoriteIds.length > 0) {
    return currentFavoriteIds;
  }

  const fetchedFavoriteIds = await fetchFavorites();
  return Array.isArray(fetchedFavoriteIds) ? fetchedFavoriteIds : [];
};
