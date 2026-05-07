import {
  buildLecturerPlaylistSearchKey,
  shouldFetchLecturerPlaylists,
} from './playlistTabState';

describe('lecturer playlist tab state', () => {
  test('does not refetch endlessly after an empty result for the same lecturer query', () => {
    const searchKey = buildLecturerPlaylistSearchKey('123', 'Shaykh Test');

    expect(
      shouldFetchLecturerPlaylists({
        activeTab: 'playlists',
        playlistsLoading: false,
        queryName: 'Shaykh Test',
        currentSearchKey: searchKey,
        lastLoadedSearchKey: null,
      }),
    ).toBe(true);

    expect(
      shouldFetchLecturerPlaylists({
        activeTab: 'playlists',
        playlistsLoading: false,
        queryName: 'Shaykh Test',
        currentSearchKey: searchKey,
        lastLoadedSearchKey: searchKey,
      }),
    ).toBe(false);
  });

  test('allows a fresh fetch when lecturer query changes', () => {
    const oldKey = buildLecturerPlaylistSearchKey('123', 'Old Name');
    const newKey = buildLecturerPlaylistSearchKey('456', 'New Name');

    expect(
      shouldFetchLecturerPlaylists({
        activeTab: 'playlists',
        playlistsLoading: false,
        queryName: 'New Name',
        currentSearchKey: newKey,
        lastLoadedSearchKey: oldKey,
      }),
    ).toBe(true);
  });

  test('does not fetch when tab is not playlists or query is missing', () => {
    const searchKey = buildLecturerPlaylistSearchKey('123', 'Shaykh Test');

    expect(
      shouldFetchLecturerPlaylists({
        activeTab: 'songs',
        playlistsLoading: false,
        queryName: 'Shaykh Test',
        currentSearchKey: searchKey,
        lastLoadedSearchKey: null,
      }),
    ).toBe(false);

    expect(
      shouldFetchLecturerPlaylists({
        activeTab: 'playlists',
        playlistsLoading: false,
        queryName: '',
        currentSearchKey: '',
        lastLoadedSearchKey: null,
      }),
    ).toBe(false);
  });
});
