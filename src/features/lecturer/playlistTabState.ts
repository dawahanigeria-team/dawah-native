type PlaylistTabType = 'songs' | 'albums' | 'playlists';

type ShouldFetchLecturerPlaylistsArgs = {
  activeTab: PlaylistTabType;
  playlistsLoading: boolean;
  queryName?: string | null;
  currentSearchKey: string;
  lastLoadedSearchKey: string | null;
};

export const buildLecturerPlaylistSearchKey = (
  lecturerId?: string | null,
  queryName?: string | null,
): string => {
  const normalizedLecturerId = (lecturerId ?? '').trim();
  const normalizedQueryName = (queryName ?? '').trim().toLowerCase();

  if (!normalizedLecturerId || !normalizedQueryName) {
    return '';
  }

  return `${normalizedLecturerId}:${normalizedQueryName}`;
};

export const shouldFetchLecturerPlaylists = ({
  activeTab,
  playlistsLoading,
  queryName,
  currentSearchKey,
  lastLoadedSearchKey,
}: ShouldFetchLecturerPlaylistsArgs): boolean => {
  if (activeTab !== 'playlists') {
    return false;
  }

  if (playlistsLoading) {
    return false;
  }

  if (!queryName?.trim()) {
    return false;
  }

  if (!currentSearchKey) {
    return false;
  }

  return currentSearchKey !== lastLoadedSearchKey;
};
