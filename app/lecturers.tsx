import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useGuardedPush } from "../src/navigation/useGuardedPush";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashList } from "../src/components/adapters/flashListCompat";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { logger } from "../src/utils/logger";
import AsyncStorage from "expo-sqlite/kv-store";
import { LecturerCard } from "../src/components/molecules/LecturerCard";
import { LecturerRow } from "../src/components/molecules/LecturerRow";
import { LecturerCardSkeleton } from "../src/components/molecules/LecturerCard.skeleton";
import { Lecturer, lecturersApi } from "../src/services/api/lecturers.api";
import { ApiError } from "../src/services/api/base.api";
import { useTheme } from "../src/hooks/useTheme";
import tw from "../src/theme/twrnc";
import { getLanguageName } from "../src/utils/languages";

type ViewMode = "list" | "grid";

const VIEW_STORAGE_KEY = "dn:lecturers:view";

export default function LecturersScreen() {
  const { colors } = useTheme();
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalScholars, setTotalScholars] = useState<number>(0);
  const itemsPerPage = 20; // Optimized for Nigerian internet speeds

  // List is the default: this screen is a directory of 300+ scholars and the
  // usual job is to find one, which needs the whole name rather than a picture.
  // Two columns of cards clip the label to about two words.
  const [view, setView] = useState<ViewMode>("list");
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(VIEW_STORAGE_KEY)
      .then((saved: string | null) => {
        if (alive && (saved === "grid" || saved === "list")) setView(saved);
      })
      .catch(() => {
        // A missing or unreadable preference just means the default.
      });
    return () => {
      alive = false;
    };
  }, []);

  const chooseView = useCallback((next: ViewMode) => {
    setView(next);
    AsyncStorage.setItem(VIEW_STORAGE_KEY, next).catch(() => {
      // Preference simply will not persist.
    });
  }, []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'popular' | 'lectures'>('popular');
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const prevDebouncedQuery = useRef<string | null>(null);
  const prevNormalizedState = useRef<string | null>(null);
  const lecturerLanguageByIdRef = useRef<Map<string, string>>(new Map());
  const lecturerImageByIdRef = useRef<Map<string, string>>(new Map());

  const resolveLecturerLanguage = useCallback((item: Lecturer): string => {
    const candidate =
      item.language ||
      (item as any).lang ||
      (item as any).language_name ||
      ((item as any).lang_id ? getLanguageName((item as any).lang_id) : undefined) ||
      lecturerLanguageByIdRef.current.get(String(item.id));

    return candidate || "Unknown";
  }, []);

  const normalizeRemoteUrl = useCallback((url?: string): string => {
    if (!url) {
      return "";
    }
    if (!/^https?:\/\//i.test(url)) {
      return url;
    }
    try {
      return encodeURI(decodeURI(url));
    } catch {
      return encodeURI(url);
    }
  }, []);

  const resolveLecturerImage = useCallback((item: Lecturer): string => {
    const candidate =
      // The 400x240 derivative first: `img` is the full-size original, up to
      // 820KB for a card drawn a couple of hundred points wide, and
      // `rp_thumbnail` is only 100x60 so it blurs at any usable size.
      item.rp_avatar ||
      item.rp_thumbnail ||
      item.img ||
      (item as any).rp_image ||
      (item as any).image ||
      (item as any).avatarUrl ||
      lecturerImageByIdRef.current.get(String(item.id)) ||
      "";

    return normalizeRemoteUrl(candidate);
  }, [normalizeRemoteUrl]);

  const normalizedState = useMemo(() => {
    if (!selectedLocation) return null;
    const match = availableStates.find(
      (state) => state.toLowerCase() === selectedLocation.toLowerCase()
    );
    return match || selectedLocation;
  }, [availableStates, selectedLocation]);

  const guardedPush = useGuardedPush();

  const handleLecturerPress = useCallback(
    (id: string) => {
      guardedPush(`/lecturer/${id}`);
    },
    [guardedPush],
  );

  const fetchStates = useCallback(async () => {
    try {
      setStatesLoading(true);
      const states = await lecturersApi.getStates();
      setAvailableStates(states);
    } catch (err) {
      console.error('Failed to load states:', err);
      setAvailableStates([]);
    } finally {
      setStatesLoading(false);
    }
  }, []);

  const fetchLecturers = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const requestParams: any = {
        page: pageNum,
        lim: itemsPerPage,
      };

      if (normalizedState) {
        requestParams.state = normalizedState;
      }

      const response = await lecturersApi.getAllLecturers(requestParams);


      // The API now reports the real catalogue size, so "is there more" is a
      // fact rather than a guess. Falling back to "this page had rows" keeps an
      // older API (which sends no total) behaving as before.
      const knownTotal =
        typeof response.total === 'number' && response.total > response.data.length
          ? response.total
          : 0;
      const hasMorePages = response.data.length > 0;

      const normalizedLecturers = response.data.map((item) => ({
        ...item,
        language: resolveLecturerLanguage(item),
        rp_thumbnail: resolveLecturerImage(item) || item.rp_thumbnail,
      }));

      normalizedLecturers.forEach((item) => {
        if (item.language && item.language !== "Unknown") {
          lecturerLanguageByIdRef.current.set(String(item.id), item.language);
        }
        const imageUrl = resolveLecturerImage(item);
        if (imageUrl) {
          lecturerImageByIdRef.current.set(String(item.id), imageUrl);
        }
      });

      if (isRefresh) {
        setLecturers(normalizedLecturers);
        setPage(1);
        setTotalScholars(knownTotal || normalizedLecturers.length);
        setHasMore(knownTotal ? normalizedLecturers.length < knownTotal : hasMorePages);
      } else if (pageNum === 1) {
        setLecturers(normalizedLecturers);
        setTotalScholars(knownTotal || normalizedLecturers.length);
        setHasMore(knownTotal ? normalizedLecturers.length < knownTotal : true);
      } else {
        // Use functional update to avoid stale closure
        setLecturers(prevLecturers => {
          // Filter out duplicates before adding
          const existingIds = new Set(prevLecturers.map(l => String(l.id)));
          const newItems = normalizedLecturers.filter((item: Lecturer) => !existingIds.has(String(item.id)));

          const newLecturers = [...prevLecturers, ...newItems];

          setTotalScholars(knownTotal || newLecturers.length);
          // Stop at the real end of the catalogue instead of firing one more
          // request that comes back empty.
          setHasMore(knownTotal ? newLecturers.length < knownTotal : hasMorePages);

          return newLecturers;
        });
      }

    } catch (err) {
      if (err instanceof ApiError && err.isCancelled) {
        return;
      }
      console.error('Failed to fetch lecturers:', err);
      setError('Failed to load scholars');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [itemsPerPage, normalizedState]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSearchResults = useCallback(async (query: string, state?: string | null) => {
    try {
      setLoading(true);
      setSearchLoading(true);
      setError(null);
      setPage(1);
      setHasMore(false);
      setLecturers([]);
      const results = await lecturersApi.searchLecturers(query, state || undefined);
      const normalizedResults = results.map((item) => ({
        ...item,
        language: resolveLecturerLanguage(item),
        rp_thumbnail: resolveLecturerImage(item) || item.rp_thumbnail,
      }));
      setLecturers(normalizedResults);
      setTotalScholars(normalizedResults.length);
    } catch (err) {
      if (err instanceof ApiError && err.isCancelled) {
        return;
      }
      console.error('Failed to search lecturers:', err);
      setError('Failed to search scholars');
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  }, []);

  // Fetch when state changes (0-1 chars) or when search is cleared
  useEffect(() => {
    const prevQuery = prevDebouncedQuery.current;
    const prevState = prevNormalizedState.current;
    const stateChanged = prevState !== normalizedState;
    const queryChanged = prevQuery !== debouncedQuery;

    prevDebouncedQuery.current = debouncedQuery;
    prevNormalizedState.current = normalizedState;

    if (debouncedQuery.length >= 2) {
      return;
    }

    if (stateChanged || (queryChanged && debouncedQuery.length === 0)) {
      setPage(1);
      setHasMore(true);
      setLecturers([]);
      fetchLecturers(1);
    }
  }, [fetchLecturers, normalizedState, debouncedQuery]);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  // Server-side search
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSearchResults(debouncedQuery, normalizedState);
    } else if (debouncedQuery.length === 0) {
      setSearchLoading(false);
    }
  }, [debouncedQuery, normalizedState, fetchSearchResults]);

  // Apply search and sorting (client-side only)
  useEffect(() => {
    let result = [...lecturers];

    logger.debug('Filtering with:', {
      totalLecturers: lecturers.length,
      searchQuery,
      sortBy
    });

    // Apply search filter (client-side only for short inputs)
    if (searchQuery.trim() && debouncedQuery.length < 2) {
      result = result.filter(lecturer =>
        lecturer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          return (b.views || 0) - (a.views || 0);
        case 'lectures':
          return (b.total_lectures || 0) - (a.total_lectures || 0);
        default:
          return 0;
      }
    });

    setFilteredLecturers(result);
  }, [lecturers, searchQuery, sortBy, debouncedQuery]);

  const handleLoadMore = () => {
    // Disable pagination when search is active
    if (searchQuery || debouncedQuery.length >= 2) {
      return;
    }

    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLecturers(nextPage);
    }
  };

  const handleRefresh = useCallback(() => {
    if (debouncedQuery.length >= 2) {
      fetchSearchResults(debouncedQuery, normalizedState);
      return;
    }
    fetchLecturers(1, true);
  }, [fetchLecturers, fetchSearchResults, debouncedQuery, normalizedState]);

  const renderLecturer = useCallback(
    ({ item }: { item: Lecturer }) => (
      <View style={tw`flex-1 px-2 mb-6`}>
        <LecturerCard
          id={String(item.id)}
          name={item.name}
          imageUrl={resolveLecturerImage(item)}
          totalLectures={item.total_lectures}
          followers={item.followers || item.views}
          language={item.language}
          verified={Boolean(item.verified) || (!!item.views && item.views > 1000)}
          onPress={() => handleLecturerPress(String(item.id))}
          style={tw`mr-0 w-full`}
        />
      </View>
    ),
    [handleLecturerPress, resolveLecturerImage]
  );

  const renderLecturerRow = useCallback(
    ({ item }: { item: Lecturer }) => (
      <LecturerRow
        id={String(item.id)}
        name={item.name}
        imageUrl={resolveLecturerImage(item)}
        state={(item as any).state}
        language={item.language}
        views={item.views}
        onPress={() => handleLecturerPress(String(item.id))}
      />
    ),
    [handleLecturerPress, resolveLecturerImage]
  );

  const renderEmptyState = useCallback(() => {
      const hasActiveFilters = searchQuery.trim() || selectedLocation;

    return (
      <View style={tw`py-20 items-center px-6`}>
        <Text
          style={[
            tw`text-base text-center`,
            { color: colors.system.label.secondary },
          ]}
        >
          {error
            ? "We couldn't load the scholars right now."
            : hasActiveFilters
              ? "No scholars found matching your filters."
              : "No scholars available at the moment."}
        </Text>

        {hasActiveFilters ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSelectedLocation(null);
            }}
            style={[
              tw`mt-4 px-5 py-3 rounded-lg`,
              { backgroundColor: colors.system.background.secondary },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                tw`text-sm font-medium`,
                { color: colors.brand.primary },
              ]}
            >
              Clear Filters
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleRefresh}
            style={[
              tw`mt-4 px-5 py-3 rounded-lg`,
              { backgroundColor: colors.system.background.secondary },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                tw`text-sm font-medium`,
                { color: colors.brand.primary },
              ]}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [error, handleRefresh, searchQuery, selectedLocation, colors]);

  const renderFooter = () => {
    if (!loadingMore) {
      // Don't show "Load More" hint when search is active
      if (searchQuery) {
        return null;
      }

      // A tappable button, not a line of grey text. Scrolling still loads the
      // next page on its own (onEndReached); this is for the reader who reaches
      // the end of 20 cards and does not realise the list continues.
      if (hasMore && lecturers.length > 0 && lecturers.length < totalScholars) {
        const remaining = totalScholars - lecturers.length;
        return (
          <View style={tw`py-6 items-center`}>
            <TouchableOpacity
              onPress={handleLoadMore}
              accessibilityRole="button"
              accessibilityLabel={`Load more scholars, ${remaining} remaining`}
              style={[
                tw`px-6 py-3 rounded-full flex-row items-center`,
                { backgroundColor: colors.system.background.secondary },
              ]}
            >
              <Text
                style={[
                  tw`text-sm font-semibold mr-1.5`,
                  { color: colors.brand.primary },
                ]}
              >
                Load more scholars
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.brand.primary}
              />
            </TouchableOpacity>
            <Text
              style={[
                tw`text-xs mt-2`,
                { color: colors.system.label.tertiary },
              ]}
            >
              {remaining} more to explore
            </Text>
          </View>
        );
      }

      // Reaching the end deserves an explicit full stop, so nobody is left
      // wondering whether the list simply failed to continue.
      if (lecturers.length > 0 && !hasMore) {
        return (
          <View style={tw`py-6 items-center`}>
            <Text
              style={[
                tw`text-xs`,
                { color: colors.system.label.tertiary },
              ]}
            >
              That&rsquo;s all {totalScholars} scholars
            </Text>
          </View>
        );
      }
      return null;
    }
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={colors.brand.primary} />
        <Text
          style={[
            tw`mt-2 text-xs`,
            { color: colors.system.label.secondary },
          ]}
        >
          Loading more scholars...
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <View style={tw`flex-row items-center px-5 py-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center`,
            { backgroundColor: colors.system.background.secondary },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.system.label.primary}
          />
        </TouchableOpacity>

        <Text
          style={[
            tw`text-xl font-bold flex-1 text-center`,
            { color: colors.system.label.primary },
          ]}
          accessibilityRole="header"
        >
          Scholars
        </Text>

        <View style={tw`w-10`} />
      </View>

      {/* Search Bar */}
      <View style={tw`px-5 pb-3`}>
        <View
          style={[
            tw`flex-row items-center px-4 py-3 rounded-xl`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={colors.system.label.tertiary}
          />
          <TextInput
            style={[
              tw`flex-1 ml-2 text-base`,
              { color: colors.system.label.primary },
            ]}
            placeholder="Search scholars"
            placeholderTextColor={colors.system.label.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.system.label.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location (State/City) Filter Chips */}
      <View style={tw`pb-3`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-5`}
        >
          {(() => {
            const options = ['All', ...availableStates];

            return options.map((loc) => {
              const isSelected = selectedLocation === loc || (loc === 'All' && !selectedLocation);
              const label = loc;
            return (
              <TouchableOpacity
                key={loc}
                onPress={() => setSelectedLocation(loc === 'All' ? null : loc)}
                style={[
                  tw`px-4 py-2 rounded-full mr-2`,
                  {
                    backgroundColor: isSelected
                      ? colors.brand.primary
                      : colors.system.background.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    tw`text-sm font-medium`,
                    {
                      color: isSelected
                        ? colors.fixed.white
                        : colors.system.label.primary,
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
            });
          })()}
        </ScrollView>
        {statesLoading && (
          <View style={tw`px-5 pt-2`}>
            <Text
              style={[
                tw`text-xs`,
                { color: colors.system.label.tertiary },
              ]}
            >
              Loading states...
            </Text>
          </View>
        )}
      </View>

      {/* Sort and Filter Controls */}
      <View style={tw`px-5 pb-3`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          {/* min-w-0 lets this actually shrink: without it the text keeps its
              intrinsic width and pushes the controls past the screen edge. */}
          <View style={tw`flex-1 min-w-0 mr-3`}>
            <Text
              numberOfLines={1}
              style={[
                tw`text-sm font-medium`,
                { color: colors.system.label.primary },
              ]}
            >
              {searchQuery || selectedLocation
                ? `${filteredLecturers.length} found`
                : totalScholars > lecturers.length
                  ? `${lecturers.length} of ${totalScholars}`
                  : `${lecturers.length} scholars`}
            </Text>
            {!searchQuery && totalScholars > lecturers.length && (
              <Text
                numberOfLines={1}
                style={[
                  tw`text-xs mt-0.5`,
                  { color: colors.system.label.tertiary },
                ]}
              >
                Scroll for more
              </Text>
            )}
          </View>

          <View style={tw`flex-row items-center shrink-0`}>
          <View
            style={[
              tw`flex-row items-center rounded-lg mr-2 p-0.5`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            {(["list", "grid"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => chooseView(mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: view === mode }}
                accessibilityLabel={`${mode === "list" ? "List" : "Grid"} view`}
                style={[
                  tw`px-3 py-1.5 rounded-md`,
                  view === mode && { backgroundColor: colors.brand.primary },
                ]}
              >
                <Ionicons
                  name={mode === "list" ? "list" : "grid"}
                  size={16}
                  color={view === mode ? colors.fixed.white : colors.system.label.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              // Cycle through sort options
              const sortOptions: ('popular' | 'name' | 'lectures')[] = ['popular', 'name', 'lectures'];
              const currentIndex = sortOptions.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortBy(sortOptions[nextIndex]);
            }}
            style={[
              tw`flex-row items-center px-3 py-2 rounded-lg`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            <Ionicons
              name="swap-vertical"
              size={16}
              color={colors.system.label.primary}
            />
            <Text
              style={[
                tw`ml-2 text-sm font-medium`,
                { color: colors.system.label.primary },
              ]}
            >
              {sortBy === 'popular' ? 'Most Popular' : sortBy === 'name' ? 'A-Z' : 'Most Lectures'}
            </Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading && lecturers.length === 0 ? (
        <FlatList
          data={Array.from({ length: 10 })}
          keyExtractor={(_, index) => `skeleton-${index}`}
          renderItem={() => (
            <View style={tw`flex-1 px-2 mb-6`}>
              <LecturerCardSkeleton />
            </View>
          )}
          numColumns={2}
          contentContainerStyle={tw`px-3 pb-10`}
          columnWrapperStyle={tw`justify-between`}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlashList
          data={filteredLecturers}
          keyExtractor={(item) => String(item.id)}
          renderItem={view === "grid" ? renderLecturer : renderLecturerRow}
          // FlashList recycles by column count, so this has to change with the
          // view or the list keeps handing rows into two-column slots.
          key={view}
          numColumns={view === "grid" ? 2 : 1}
          contentContainerStyle={view === "grid" ? tw`px-3 pb-10` : tw`pb-10`}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || searchLoading}
              onRefresh={handleRefresh}
              tintColor={colors.brand.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          accessibilityLabel="List of scholars"
        />
      )}
    </SafeAreaView>
  );
}
