import React from 'react';
import renderer, { act } from 'react-test-renderer';
import SectionScreen from './[type]';
import { ApiError } from '../../src/services/api/base.api';
import { quranApi } from '../../src/services/api/quran.api';

let mockListProps: any;

jest.mock('../../src/components/adapters/flashListCompat', () => ({
  FlashList: (props: any) => {
    mockListProps = props;
    const Footer = props.ListFooterComponent;
    return Footer ? <Footer /> : null;
  },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ type: 'quran-recitations' }),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../src/navigation/useGuardedPush', () => ({ useGuardedPush: () => jest.fn() }));
jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({ colors: require('../../src/theme/designTokens').colorsLight }),
}));
jest.mock('../../src/components/molecules/Card', () => ({ Card: 'Card' }));
jest.mock('../../src/components/molecules/SearchBar', () => ({ SearchBar: 'SearchBar' }));
jest.mock('../../src/components/molecules/ScreenHeader', () => ({ ScreenHeader: 'ScreenHeader' }));
jest.mock('../../src/components/molecules/LectureRow', () => ({ LectureRow: 'LectureRow' }));
jest.mock('../../src/components/atoms', () => ({ Chip: 'Chip', Text: 'Text' }));
jest.mock('../../src/stores', () => ({ usePlayerActions: () => ({ playEpisode: jest.fn() }) }));
jest.mock('../../src/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: false, isInitialized: true }),
}));
jest.mock('../../src/stores/listeningPreferencesStore', () => ({
  initializeListeningPreferences: jest.fn(),
  useListeningPreferencesStore: () => ({
    preferences: { languageIds: [], lecturerIds: [] },
    isHydrated: true,
  }),
}));
const mockIdleFeed = {
  lectures: [], albums: [], loading: false, error: null, refetch: jest.fn(),
  loadMore: jest.fn(), hasMore: false, isLoadingMore: false,
};
jest.mock('../../src/hooks/useTrending', () => ({ useTrending: () => mockIdleFeed }));
jest.mock('../../src/hooks/useRecent', () => ({ useRecent: () => mockIdleFeed }));
jest.mock('../../src/hooks/useRamadanAlbums', () => ({ useRamadanAlbums: () => mockIdleFeed }));
jest.mock('../../src/hooks/useRecentlyPlayedLectures', () => ({
  useRecentlyPlayedLectures: () => mockIdleFeed,
}));
jest.mock('../../src/services/api/quran.api', () => ({
  quranApi: { getQuranAlbums: jest.fn() },
}));

const getQuranAlbums = quranApi.getQuranAlbums as jest.Mock;
const album = (id: string) => ({ id, name: id, img: '', alb_thumbnail: '', lec_no: 1, language: 'Arabic' });

beforeEach(() => {
  getQuranAlbums.mockReset();
  getQuranAlbums.mockImplementation(async ({ page }: { page: number }) => {
    if (page === 1) return { albums: [album('a'), album('b')], total: 4, page, hasMore: true };
    throw new ApiError('Internal server error', 500);
  });
});

test('a failed next page is not re-requested every time the list end is reached', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<SectionScreen />); });
  expect(getQuranAlbums).toHaveBeenCalledTimes(1);

  // FlashList fires onEndReached again whenever the footer collapses after a
  // failed load, which is what turned one 500 into a request loop.
  for (let i = 0; i < 5; i += 1) {
    await act(async () => { mockListProps.onEndReached(); });
  }
  const pageTwoRequests = getQuranAlbums.mock.calls.filter(([p]) => p.page === 2);
  expect(pageTwoRequests).toHaveLength(1);

  getQuranAlbums.mockImplementation(async ({ page }: { page: number }) => (
    { albums: [album(`p${page}`)], total: 3, page, hasMore: false }
  ));
  const retry = tree.root.findByProps({ accessibilityLabel: 'Retry loading more quran reciters' });
  await act(async () => { retry.props.onPress(); });
  expect(getQuranAlbums.mock.calls.filter(([p]) => p.page === 2)).toHaveLength(2);
  expect(mockListProps.data.map((a: { id: string }) => a.id)).toEqual(['a', 'b', 'p2']);
  expect(tree.root.findAllByProps({ accessibilityLabel: 'Retry loading more quran reciters' })).toHaveLength(0);
});
