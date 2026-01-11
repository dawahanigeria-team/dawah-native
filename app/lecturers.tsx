import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { LecturerCard } from "../src/components/molecules/LecturerCard";
import { LecturerCardSkeleton } from "../src/components/molecules/LecturerCard.skeleton";
import { Lecturer, lecturersApi } from "../src/services/api/lecturers.api";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";

export default function LecturersScreen() {
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

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'popular' | 'lectures'>('popular');

  const extractLocationFromName = (name: string): string | null => {
    // Common pattern: "Full Name (State/City)".
    // We take the last parentheses group. If none, return null.
    const match = name.match(/\(([^)]+)\)\s*$/);
    if (!match?.[1]) return null;
    const location = match[1].trim();
    if (!location) return null;
    return location;
  };

  const handleLecturerPress = useCallback((id: string) => {
    router.push(`/lecturer/${id}`);
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

      const response = await lecturersApi.getAllLecturers(requestParams);


      // Determine if there are more pages based on data received
      const hasMorePages = response.data.length > 0;

      if (isRefresh) {
        setLecturers(response.data);
        setPage(1);
        setHasMore(hasMorePages);
        setTotalScholars(response.total || response.data.length);
      } else if (pageNum === 1) {
        setLecturers(response.data);
        // Always try to load page 2, even if page 1 returned less than requested
        setHasMore(true);
        setTotalScholars(response.total || response.data.length);
      } else {
        // Use functional update to avoid stale closure
        setLecturers(prevLecturers => {
          // Filter out duplicates before adding
          const existingIds = new Set(prevLecturers.map(l => String(l.id)));
          const newItems = response.data.filter((item: Lecturer) => !existingIds.has(String(item.id)));

          if (newItems.length === 0 && response.data.length > 0) {
            // If we got data but they are all duplicates, it might mean we are fetching the same page or overlapping data.
          }

          const newLecturers = [...prevLecturers, ...newItems];

          // Update total scholars count
          setTotalScholars(response.total || newLecturers.length);

          return newLecturers;
        });

        // Keep trying to load more as long as we got some data
        setHasMore(hasMorePages);
      }

    } catch (err) {
      console.error('Failed to fetch lecturers:', err);
      setError('Failed to load scholars');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [itemsPerPage]);

  // Initial load
  useEffect(() => {
    fetchLecturers(1);
  }, [fetchLecturers]);

  // Apply search and sorting (client-side only)
  useEffect(() => {
    let result = [...lecturers];

    // Apply search filter (client-side)
    if (searchQuery.trim()) {
      result = result.filter(lecturer =>
        lecturer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply location filter (client-side)
    if (selectedLocation) {
      result = result.filter((lecturer) => {
        const location = extractLocationFromName(lecturer.name);
        return location === selectedLocation;
      });
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
  }, [lecturers, searchQuery, sortBy, selectedLocation]);

  // Reset page when filters are cleared to re-enable pagination
  useEffect(() => {
    if (!searchQuery && !selectedLocation && page > 1) {
      // Filters cleared, reset to enable pagination from current point
      setHasMore(lecturers.length < totalScholars);
    }
  }, [searchQuery, selectedLocation, page, lecturers.length, totalScholars]);

  const handleLoadMore = () => {
    // Disable pagination when filters are active (client-side filtering requires all data)
    if (searchQuery || selectedLocation) {
      return;
    }

    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLecturers(nextPage);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchLecturers(1, true);
  }, [fetchLecturers]);

  const renderLecturer = useCallback(
    ({ item }: { item: Lecturer }) => (
      <View style={tw`w-1/2 px-2 mb-6`}>
        <LecturerCard
          id={String(item.id)}
          name={item.name}
          imageUrl={item.rp_thumbnail || item.img}
          totalLectures={item.total_lectures}
          followers={item.followers || item.views}
          language={item.language}
          verified={Boolean(item.verified) || (!!item.views && item.views > 1000)}
          onPress={() => handleLecturerPress(String(item.id))}
          style={tw`mr-0 w-full`}
        />
      </View>
    ),
    [handleLecturerPress]
  );

  const renderEmptyState = useCallback(() => {
    const hasActiveFilters = searchQuery.trim() || selectedLocation;

    return (
      <View style={tw`py-20 items-center px-6`}>
        <Text
          style={[
            tw`text-base text-center`,
            { color: designTokens.colors.system.label.secondary },
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
              { backgroundColor: designTokens.colors.system.background.secondary },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                tw`text-sm font-medium`,
                { color: designTokens.colors.brand.primary },
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
              { backgroundColor: designTokens.colors.system.background.secondary },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                tw`text-sm font-medium`,
                { color: designTokens.colors.brand.primary },
              ]}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [error, handleRefresh, searchQuery, selectedLocation]);

  const renderFooter = () => {
    if (!loadingMore) {
      // Don't show "Load More" hint when filters are active (pagination is disabled)
      if (searchQuery || selectedLocation) {
        return null;
      }

      // Show "Load More" hint if there are more scholars
      if (hasMore && lecturers.length > 0 && lecturers.length < totalScholars) {
        return (
          <View style={tw`py-6 items-center`}>
            <Text
              style={[
                tw`text-xs`,
                { color: designTokens.colors.system.label.tertiary },
              ]}
            >
              Scroll to load more scholars
            </Text>
          </View>
        );
      }
      return null;
    }
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
        <Text
          style={[
            tw`mt-2 text-xs`,
            { color: designTokens.colors.system.label.secondary },
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
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
    >
      <View style={tw`flex-row items-center px-5 py-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center`,
            { backgroundColor: designTokens.colors.system.background.secondary },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={designTokens.colors.system.label.primary}
          />
        </TouchableOpacity>

        <Text
          style={[
            tw`text-xl font-bold flex-1 text-center`,
            { color: designTokens.colors.system.label.primary },
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
            { backgroundColor: designTokens.colors.system.background.secondary },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={designTokens.colors.system.label.tertiary}
          />
          <TextInput
            style={[
              tw`flex-1 ml-2 text-base`,
              { color: designTokens.colors.system.label.primary },
            ]}
            placeholder="Search scholars"
            placeholderTextColor={designTokens.colors.system.label.tertiary}
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
                color={designTokens.colors.system.label.tertiary}
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
            const locations = Array.from(
              new Set(
                lecturers
                  .map((l) => extractLocationFromName(l.name))
                  .filter(Boolean) as string[]
              )
            ).sort((a, b) => a.localeCompare(b));

            const options = ['All', ...locations];

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
                      ? designTokens.colors.brand.primary
                      : designTokens.colors.system.background.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    tw`text-sm font-medium`,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : designTokens.colors.system.label.primary,
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
      </View>

      {/* Sort and Filter Controls */}
      <View style={tw`px-5 pb-3`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <View>
            <Text
              style={[
                tw`text-sm font-medium`,
                { color: designTokens.colors.system.label.primary },
              ]}
            >
              {searchQuery || selectedLocation
                ? `${filteredLecturers.length} found`
                : `${lecturers.length} scholars`}
            </Text>
            {!searchQuery && !selectedLocation && totalScholars > lecturers.length && (
              <Text
                style={[
                  tw`text-xs mt-0.5`,
                  { color: designTokens.colors.system.label.tertiary },
                ]}
              >
                Scroll for more
              </Text>
            )}
            {(searchQuery || selectedLocation) && lecturers.length < totalScholars && (
              <Text
                style={[
                  tw`text-xs mt-0.5`,
                  { color: designTokens.colors.system.label.tertiary },
                ]}
              >
                Clear filters to load more
              </Text>
            )}
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
              { backgroundColor: designTokens.colors.system.background.secondary },
            ]}
          >
            <Ionicons
              name="swap-vertical"
              size={16}
              color={designTokens.colors.system.label.primary}
            />
            <Text
              style={[
                tw`ml-2 text-sm font-medium`,
                { color: designTokens.colors.system.label.primary },
              ]}
            >
              {sortBy === 'popular' ? 'Most Popular' : sortBy === 'name' ? 'A-Z' : 'Most Lectures'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && lecturers.length === 0 ? (
        <FlatList
          data={Array.from({ length: 10 })}
          keyExtractor={(_, index) => `skeleton-${index}`}
          renderItem={() => (
            <View style={tw`w-1/2 px-2 mb-6`}>
              <LecturerCardSkeleton />
            </View>
          )}
          numColumns={2}
          contentContainerStyle={tw`px-3 pb-10`}
          columnWrapperStyle={tw`justify-between`}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredLecturers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLecturer}
          numColumns={2}
          contentContainerStyle={tw`px-3 pb-10`}
          columnWrapperStyle={tw`justify-between`}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={designTokens.colors.brand.primary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="List of scholars"
        />
      )}
    </SafeAreaView>
  );
}
