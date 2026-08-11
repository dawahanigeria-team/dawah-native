import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../src/components/atoms";
import { ErrorBoundary } from "../src/components/atoms/ErrorBoundary";
import { Dropdown } from "../src/components/atoms/Dropdown";
import { Card } from "../src/components/molecules/Card";
import { CardSkeleton } from "../src/components/molecules/Card.skeleton";
import { FilterSection } from "../src/components/molecules/FilterSection";
import { SearchBar } from "../src/components/molecules/SearchBar";
import { surahs } from "../src/data/surahs";
import { useLecturers } from "../src/hooks/useLecturers";
import { useSearchLectures } from "../src/hooks/useSearch";
import { useTheme } from "../src/hooks/useTheme";
import { searchApi } from "../src/services/api/search.api";
import { analytics } from "../src/services/analytics.service";
import tw from "../src/theme/twrnc";
import {
  SearchAlbum,
  SearchLecture,
  SearchLecturer,
} from "../src/types/api.types";
import {
  Language,
  SearchFilters,
  SortOption,
  Topic,
} from "../src/types/search";
import { Episode } from "../src/types/types";

const languages: Language[] = [
  "All",
  "English",
  "Yoruba",
  "Hausa",
  "Igala",
  "Fulani",
  "Igbo",
];
const topics: Topic[] = [
  "All",
  "Quran Recitation",
  "Tafsir",
  "Faith & Creed",
  "Charity",
  "Fajr Talk",
  "Ramadan",
];

const sortOptions = [
  { label: "Most Recent", value: "recent" as SortOption },
  { label: "Oldest First", value: "oldest" as SortOption },
  { label: "Most Followers", value: "followers" as SortOption },
  { label: "Most Views", value: "views" as SortOption },
  { label: "A-Z", value: "a-z" as SortOption },
  { label: "Z-A", value: "z-a" as SortOption },
];

type SearchSection = "overview" | "lecturers" | "lectures" | "albums";

export default function SearchScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <SearchScreen />
    </ErrorBoundary>
  );
}

function SearchScreen() {
  const { colors } = useTheme();
  const searchParams = useLocalSearchParams();
  const initialQuery = (searchParams.q as string) || "";

  // Fetch lecturers for filter
  const { lecturerCards } = useLecturers(50);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    language: "All",
    topic: "All",
    surah: "All",
    sortBy: "followers",
    lecturerId: undefined,
  });

  // Local state for search input - separate from actual search query
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [actualSearchQuery, setActualSearchQuery] = useState(initialQuery);
  const [activeSection, setActiveSection] = useState<SearchSection>("overview");
  const [lecturerResults, setLecturerResults] = useState<SearchLecturer[]>([]);
  const [lecturerTotal, setLecturerTotal] = useState(0);
  const [albumResults, setAlbumResults] = useState<SearchAlbum[]>([]);
  const [albumTotal, setAlbumTotal] = useState(0);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Use the search API hook - only searches when actualSearchQuery changes
  const {
    data: apiResults,
    loading,
    error,
    setQuery,
    setFilters: setSearchFilters,
    loadMore,
    hasMore,
    totalResults,
    currentPage,
    totalPages,
  } = useSearchLectures({
    debounceDelay: 0, // No debounce, we control when to search
    minQueryLength: 2,
    enableQuickSearch: false, // Disable quick search to get more results
  });

  // Only trigger search when actualSearchQuery changes (Enter pressed)
  useEffect(() => {
    if (actualSearchQuery) {
      setQuery(actualSearchQuery);
    }
  }, [actualSearchQuery, setQuery]);

  useEffect(() => {
    let active = true;
    const query = actualSearchQuery.trim();

    if (query.length < 2) {
      queueMicrotask(() => {
        if (!active) return;
        setLecturerResults([]);
        setLecturerTotal(0);
        setAlbumResults([]);
        setAlbumTotal(0);
        setDiscoveryLoading(false);
      });
      return () => {
        active = false;
      };
    }

    const searchPromise = searchApi.searchDiscovery(query);
    queueMicrotask(() => {
      if (active) setDiscoveryLoading(true);
    });
    void searchPromise
      .then((result) => {
        if (!active) return;
        setLecturerResults(result.lecturers);
        setLecturerTotal(result.lecturerTotal);
        setAlbumResults(result.albums);
        setAlbumTotal(result.albumTotal);
      })
      .finally(() => {
        if (active) setDiscoveryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [actualSearchQuery]);

  // Sync filters with search hook
  useEffect(() => {
    // Map UI filters to what the hook expects
    setSearchFilters({
      ...filters,
      lecturerId: filters.lecturerId === "All" ? undefined : filters.lecturerId,
    });
  }, [filters, setSearchFilters]);

  // Handle search submission (Enter key or search button)
  const handleSearch = (searchText: string) => {
    const query = searchText.trim();
    if (query.length >= 2) {
      analytics.capture("search_performed", {
        query,
        language: filters.language,
        topic: filters.topic,
      });
    }
    setActiveSection("overview");
    setActualSearchQuery(query);
  };

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateSurahFilter = (value: string) => {
    // @ts-ignore - Safe type assertion since FilterSection options are from surahs array
    setFilters((prev) => ({ ...prev, surah: value }));
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const clearFilters = () => {
    setFilters({
      language: "All",
      topic: "All",
      surah: "All",
      sortBy: "followers",
      lecturerId: undefined,
    });
  };

  // Convert API lecture to Episode format
  const convertToEpisode = (lecture: SearchLecture): Episode => {
    const parseDuration = (duration: string | undefined): number => {
      if (!duration) return 0;
      const parts = duration.split(":").map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    };

    // Support both new API fields and legacy fields
    const id = String(
      lecture.id ||
        lecture.nid ||
        `lecture-${lecture.mp3_url || lecture.AudioUrl || lecture.mp3_title || lecture.Title || "unknown"}`,
    );
    const title = lecture.mp3_title || lecture.Title || "Untitled Lecture";
    const duration = lecture.mp3_duration || lecture.Duration;
    const audioUrl = lecture.mp3_url || lecture.AudioUrl || "";
    const coverUrl =
      lecture.img ||
      lecture.lec_img ||
      lecture.rp_image ||
      lecture.lecturer_image ||
      lecture.CoverUrl ||
      "";
    const plays = parseInt(lecture.views || lecture.Plays || "0") || 0;
    const language = lecture.language || lecture.Language || "Unknown";
    const downloads =
      parseInt(lecture.downloads || lecture.Downloads || "0") || 0;
    // Pull the post date from any field the backend might use. Fall back to
    // '' (NOT "now") so undated rows render without a misleading "just now".
    const createdAt =
      lecture.created_at ||
      lecture.CreatedAt ||
      (lecture as any).post_date ||
      (lecture as any).updated_date ||
      '';
    // Map lecturer name from various possible fields
    const lecturerName =
      lecture.lecturer_name ||
      lecture.rpname ||
      lecture.ResourcePerson ||
      undefined;

    return {
      id,
      title,
      durationSec: parseDuration(duration),
      coverUrl,
      audioUrl,
      seriesId: "",
      plays,
      liked: false,
      language,
      downloads,
      createdAt,
      lecturerName,
    };
  };

  const handleItemPress = (item: SearchLecture) => {
    const lectureId = item.nid || item.id;
    if (lectureId) {
      router.push(`/lecture/${lectureId}`);
    }
  };

  // Date sorting is applied by the search API across the whole result set
  // (see useSearch's sortBy mapping). Sorting here instead would only reorder
  // the currently-loaded page out of tens of thousands of matches, which reads
  // as working while showing the wrong rows.
  const filteredAndSortedResults = useMemo(() => apiResults || [], [apiResults]);

  const getItemKey = (item: SearchLecture, index: number) => {
    return `api-${String(item.id || item.nid || index)}-${index}`;
  };

  const renderSearchResult = (item: SearchLecture) => {
    const resourcePerson =
      item.lecturer_name || item.ResourcePerson || "Unknown Scholar";
    const metaValue = resourcePerson;
    const data = convertToEpisode(item);

    return (
      <Card
        variant="landscape"
        data={data}
        onPress={() => handleItemPress(item)}
        playOnPress={false}
        showTime={true}
        showMeta={true}
        metaValue={metaValue}
        titleNumberOfLines={2}
        metaNumberOfLines={1}
        showBadge={false}
      />
    );
  };

  const renderSectionHeader = (
    title: string,
    total: number,
    section: Exclude<SearchSection, "overview">,
    showSeeAll: boolean,
  ) => (
    <View style={tw`flex-row items-center justify-between mb-3`}>
      <View style={tw`flex-row items-center`}>
        <Text variant="title3" color="label" weight="bold">
          {title}
        </Text>
        <View
          style={[
            tw`ml-2 px-2 py-0.5 rounded-full`,
            { backgroundColor: colors.system.fill.tertiary },
          ]}
        >
          <Text variant="caption1" color="secondaryLabel">
            {total}
          </Text>
        </View>
      </View>
      {showSeeAll && total > 0 && (
        <TouchableOpacity
          onPress={() => setActiveSection(section)}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title.toLowerCase()}`}
          style={tw`min-h-[44px] px-2 justify-center`}
        >
          <Text variant="subheadline" color="brand" weight="semibold">
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLecturerResult = (item: SearchLecturer) => {
    const raw = item as SearchLecturer & {
      img?: string;
      rp_thumbnail?: string;
      views?: number;
    };
    const name = raw.name || "Unknown Scholar";
    const initial = name.trim().charAt(0).toUpperCase() || "S";
    const imageUrl = raw.avatarUrl || raw.rp_thumbnail || raw.img;

    return (
      <TouchableOpacity
        key={`lecturer-${raw.id}`}
        onPress={() =>
          router.push({
            pathname: "/lecturer/[id]",
            params: { id: String(raw.id), name },
          })
        }
        activeOpacity={0.75}
        style={[
          tw`flex-row items-center p-4 mb-3 rounded-xl`,
          {
            backgroundColor: colors.system.background.secondary,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.system.separator.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open scholar ${name}`}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={tw`w-12 h-12 rounded-full`}
            contentFit="cover"
            transition={150}
            accessibilityLabel={`${name} profile photo`}
          />
        ) : (
          <View
            style={[
              tw`w-12 h-12 rounded-full items-center justify-center`,
              { backgroundColor: colors.system.fill.secondary },
            ]}
          >
            <Text variant="headline" color="label" weight="bold">
              {initial}
            </Text>
          </View>
        )}
        <View style={tw`flex-1 ml-3`}>
          <Text variant="headline" color="label" weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption1" color="secondaryLabel" numberOfLines={1}>
            Scholar{raw.language ? ` • ${String(raw.language)}` : ""}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.system.label.tertiary}
        />
      </TouchableOpacity>
    );
  };

  const renderAlbumResult = (item: SearchAlbum) => {
    const raw = item as SearchAlbum & {
      name?: string;
      lecturer_name?: string;
      lec_no?: number;
      img?: string;
      alb_thumbnail?: string;
    };
    const title = raw.title || raw.name || "Untitled album";
    const lecturerName = raw.lecturerName || raw.lecturer_name || "Unknown Scholar";
    const trackCount = raw.trackCount || raw.lec_no || 0;
    const imageUrl = raw.coverUrl || raw.alb_thumbnail || raw.img;

    return (
      <TouchableOpacity
        key={`album-${raw.id}`}
        onPress={() => router.push(`/album/${raw.id}`)}
        activeOpacity={0.75}
        style={[
          tw`flex-row items-center p-4 mb-3 rounded-xl`,
          {
            backgroundColor: colors.system.background.secondary,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.system.separator.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open album ${title}`}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={tw`w-12 h-12 rounded-lg`}
            contentFit="cover"
            transition={150}
            accessibilityLabel={`${title} album artwork`}
          />
        ) : (
          <View
            style={[
              tw`w-12 h-12 rounded-lg items-center justify-center`,
              { backgroundColor: colors.system.fill.secondary },
            ]}
          >
            <Ionicons
              name="albums"
              size={22}
              color={colors.system.label.secondary}
            />
          </View>
        )}
        <View style={tw`flex-1 ml-3`}>
          <Text variant="headline" color="label" weight="semibold" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption1" color="secondaryLabel" numberOfLines={1}>
            {lecturerName}{trackCount > 0 ? ` • ${trackCount} lectures` : ""}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.system.label.tertiary}
        />
      </TouchableOpacity>
    );
  };

  const visibleLecturers =
    activeSection === "lecturers" ? lecturerResults : lecturerResults.slice(0, 2);
  const visibleAlbums =
    activeSection === "albums" ? albumResults : albumResults.slice(0, 2);
  const visibleLectures =
    activeSection === "overview"
      ? filteredAndSortedResults.slice(0, 5)
      : activeSection === "lectures"
        ? filteredAndSortedResults
        : [];
  const combinedTotal = lecturerTotal + totalResults + albumTotal;
  const currentSectionTotal =
    activeSection === "lecturers"
      ? lecturerTotal
      : activeSection === "lectures"
        ? totalResults
        : activeSection === "albums"
          ? albumTotal
          : combinedTotal;
  const searchLoading = loading || discoveryLoading;
  const hasVisibleResults =
    activeSection === "lecturers"
      ? visibleLecturers.length > 0
      : activeSection === "albums"
        ? visibleAlbums.length > 0
        : activeSection === "lectures"
          ? visibleLectures.length > 0
          : visibleLecturers.length + visibleLectures.length + visibleAlbums.length > 0;

  const renderEmptyState = () => (
    <View style={tw`flex-1 items-center justify-center py-20 px-6`}>
      <View
        style={[
          tw`w-20 h-20 rounded-full items-center justify-center mb-6`,
          { backgroundColor: colors.system.fill.tertiary },
        ]}
      >
        <Ionicons
          name="search"
          size={40}
          color={colors.system.label.tertiary}
          accessibilityLabel="Search icon"
        />
      </View>
      <Text
        variant="title2"
        color="label"
        weight="semibold"
        style={tw`mb-3 text-center`}
        accessibilityRole="header"
      >
        {error
          ? "Something went wrong"
          : actualSearchQuery || hasActiveFilters()
            ? "No results found"
            : "Discover Islamic content"}
      </Text>
      <Text
        variant="body"
        color="secondaryLabel"
        style={tw`text-center leading-6 max-w-sm`}
        accessibilityLabel={
          error
            ? error.message
            : actualSearchQuery || hasActiveFilters()
              ? "No results found. Try adjusting your search or filters"
              : "Search for lectures, Quranic recitations, and Islamic teachings"
        }
      >
        {error
          ? error.message
          : actualSearchQuery || hasActiveFilters()
            ? "Try adjusting your search terms or clearing some filters to find what you're looking for"
            : "Search for lectures, Quranic recitations, and Islamic teachings from trusted scholars"}
      </Text>
    </View>
  );

  const hasActiveFilters = () => {
    return (
      filters.language !== "All" ||
      filters.topic !== "All" ||
      (filters.lecturerId && filters.lecturerId !== "All") ||
      (["Quran Recitation", "Tafsir"].includes(filters.topic) &&
        filters.surah !== "All")
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.language !== "All") count++;
    if (filters.topic !== "All") count++;
    if (filters.lecturerId && filters.lecturerId !== "All") count++;
    if (
      ["Quran Recitation", "Tafsir"].includes(filters.topic) &&
      filters.surah !== "All"
    )
      count++;
    return count;
  };

  return (
    <SafeAreaView
      style={[tw`flex-1`, { backgroundColor: colors.system.background.primary }]}
    >
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-5 py-4`}>
        <View style={tw`flex-row items-center flex-1`}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-3 w-10 h-10 items-center justify-center rounded-full`}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.system.label.primary}
            />
          </TouchableOpacity>

          {/* Page Title */}
          <Text variant="title1" color="label" weight="bold">
            Search
          </Text>
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[
            tw`flex-row items-center px-4 py-2.5 rounded-full min-h-[44px]`,
            { backgroundColor: colors.system.background.secondary },
          ]}
          onPress={toggleFilters}
          accessibilityLabel="Toggle filters"
          accessibilityRole="button"
        >
          <Ionicons
            name="options"
            size={18}
            color={colors.system.label.primary}
          />
          <Text
            variant="subheadline"
            color="label"
            weight="medium"
            style={tw`ml-2`}
          >
            Filter
          </Text>
          {getActiveFilterCount() > 0 && (
            <View
              style={[
                tw`w-5 h-5 rounded-full items-center justify-center ml-2`,
                { backgroundColor: colors.brand.primary },
              ]}
            >
              <Text
                variant="caption2"
                weight="bold"
                style={{ color: colors.fixed.black }}
              >
                {getActiveFilterCount()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={tw`px-5 pb-5`}>
        <SearchBar
          placeholder="Try: Suratul Ikhlas"
          value={searchInput}
          onChangeText={setSearchInput}
          onSearch={handleSearch}
          onMicPress={() => {}}
        />
      </View>

      {/* Results summary and lecture sorting */}
      <View style={tw`px-5 mb-5`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text variant="headline" color="label" weight="semibold">
            {searchLoading ? "Searching..." : `${currentSectionTotal} Results`}
          </Text>
          {(activeSection === "overview" || activeSection === "lectures") && (
          <View style={tw`flex-row items-center`}>
            <Text variant="subheadline" color="label" weight="medium" style={tw`mr-3`}>
              Sort by
            </Text>
            <View style={tw`min-w-32`}>
              <Dropdown
                options={sortOptions}
                selectedValue={filters.sortBy}
                onSelect={(value) => updateFilter("sortBy", value as SortOption)}
                placeholder="Select"
              />
            </View>
          </View>
          )}
        </View>
      </View>

      <FlatList
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        // Extra bottom padding so the last search results clear the mini-player
        contentContainerStyle={tw`pb-40`}
        data={
          searchLoading && actualSearchQuery && !hasVisibleResults
            ? []
            : visibleLectures
        }
        keyExtractor={(item, index) => getItemKey(item, index)}
        renderItem={({ item }) => (
          <View style={tw`px-5`}>{renderSearchResult(item)}</View>
        )}
        ListHeaderComponent={
          <View style={tw`px-5`}>
            {activeSection !== "overview" && (
              <TouchableOpacity
                onPress={() => setActiveSection("overview")}
                accessibilityRole="button"
                style={tw`flex-row items-center min-h-[44px] mb-3`}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={colors.brand.primary}
                />
                <Text variant="subheadline" color="brand" weight="semibold" style={tw`ml-2`}>
                  All search results
                </Text>
              </TouchableOpacity>
            )}

            {showFilters && (activeSection === "overview" || activeSection === "lectures") ? (
            <View
              style={[
                tw`pt-6 pb-4 mb-6 mx-1 rounded-xl`,
                {
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.system.separator.primary,
                },
              ]}
            >
              {/* Filter Header */}
              <View style={tw`flex-row items-center justify-between px-5 mb-6`}>
                <Text variant="title2" color="label" weight="bold">
                  Filters
                </Text>
                {hasActiveFilters() && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    style={[
                      tw`px-3 py-1 rounded-lg min-h-[44px] justify-center`,
                      { backgroundColor: colors.system.fill.tertiary },
                    ]}
                  >
                    <Text variant="subheadline" color="brand" weight="semibold">
                      Clear All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Language Filter */}
              <FilterSection
                title="Language"
                options={languages}
                selectedValue={filters.language}
                onSelect={(value) => updateFilter("language", value as Language)}
              />

              {/* Topic Filter */}
              <FilterSection
                title="Topics"
                options={topics}
                selectedValue={filters.topic}
                onSelect={(value) => updateFilter("topic", value as Topic)}
              />

              {/* Scholar Filter */}
              <FilterSection
                title="Scholar"
                options={["All", ...lecturerCards.map((l) => l.name)]}
                selectedValue={
                  filters.lecturerId
                    ? lecturerCards.find((l) => l.id === filters.lecturerId)
                        ?.name || "All"
                    : "All"
                }
                onSelect={(name) => {
                  const lecturer = lecturerCards.find((l) => l.name === name);
                  updateFilter("lecturerId", lecturer ? lecturer.id : undefined);
                }}
                searchable={true}
              />

              {/* Surah Filter - show when Quran Recitation or Tafsir is selected */}
              {["Quran Recitation", "Tafsir"].includes(filters.topic) && (
                <FilterSection
                  title="Surah"
                  options={[...surahs]}
                  selectedValue={filters.surah}
                  onSelect={updateSurahFilter}
                  searchable={true}
                />
              )}
            </View>
            ) : null}

            {(activeSection === "overview" || activeSection === "lecturers") && (
              <View style={tw`mb-6`}>
                {renderSectionHeader(
                  "Scholars",
                  lecturerTotal,
                  "lecturers",
                  activeSection === "overview" && lecturerTotal > 2,
                )}
                {visibleLecturers.map(renderLecturerResult)}
              </View>
            )}

            {(activeSection === "overview" || activeSection === "lectures") &&
              renderSectionHeader(
                "Lectures",
                totalResults,
                "lectures",
                activeSection === "overview" && totalResults > 5,
              )}

            {activeSection === "albums" && (
              <View style={tw`mb-6`}>
                {renderSectionHeader("Albums", albumTotal, "albums", false)}
                {visibleAlbums.map(renderAlbumResult)}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          searchLoading && actualSearchQuery ? (
            <View style={tw`px-5`}>
              {[...Array(5)].map((_, index) => (
                <CardSkeleton
                  key={`skeleton-${index}`}
                  variant="landscape"
                  style={tw`mb-4`}
                />
              ))}
            </View>
          ) : !hasVisibleResults ? (
            <View style={tw`px-5`}>{renderEmptyState()}</View>
          ) : null
        }
        ListFooterComponent={
          hasVisibleResults ? (
            <View style={tw`px-5`}>
              {activeSection === "overview" && (
                <View style={tw`pt-5`}>
                  {renderSectionHeader(
                    "Albums",
                    albumTotal,
                    "albums",
                    albumTotal > 2,
                  )}
                  {visibleAlbums.map(renderAlbumResult)}
                </View>
              )}

              {/* Load More Indicator */}
              {activeSection === "lectures" && hasMore && actualSearchQuery && (
                <View style={tw`py-6`}>
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  ) : null}
                </View>
              )}

              {/* Pagination Info */}
              {activeSection === "lectures" && actualSearchQuery && totalPages > 0 && (
                <View style={tw`py-4 items-center`}>
                  <Text variant="caption1" color="secondaryLabel">
                    Page {currentPage} of {totalPages} •{" "}
                    {filteredAndSortedResults.length} of {totalResults} results
                  </Text>
                </View>
              )}
            </View>
          ) : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (activeSection === "lectures" && hasMore && !loading && actualSearchQuery) {
            loadMore();
          }
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </SafeAreaView>
  );
}
