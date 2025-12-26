import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dropdown } from "../src/components/atoms/Dropdown";
import { Card } from "../src/components/molecules/Card";
import { CardSkeleton } from "../src/components/molecules/Card.skeleton";
import { FilterSection } from "../src/components/molecules/FilterSection";
import { SearchBar } from "../src/components/molecules/SearchBar";
import { surahs } from "../src/data/surahs";
import { useSearchLectures } from "../src/hooks/useSearch";
import { useLecturers } from "../src/hooks/useLecturers";
import { usePlayerActions } from "../src/stores";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";
import { SearchLecture } from "../src/types/api.types";
import {
  Language,
  SearchFilters,
  SortOption,
  Topic,
} from "../src/types/search";
import { Episode, Series } from "../src/types/types";

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
  { label: "Most Followers", value: "followers" as SortOption },
  { label: "Most Views", value: "views" as SortOption },
  { label: "A-Z", value: "a-z" as SortOption },
  { label: "Z-A", value: "z-a" as SortOption },
];

interface ExtendedEpisode extends Omit<Episode, 'language'> {
  followers?: number;
  views?: number;
  language: Language;
  topic?: Topic;
  surah?: string;
}

interface ExtendedSeries extends Omit<Series, 'language'> {
  followers?: number;
  views?: number;
  language: Language;
  topic?: Topic;
}

const mockSearchResults: (ExtendedEpisode | ExtendedSeries)[] = [
  {
    id: "1",
    title: "Introduction to Tafsir Methodology",
    durationSec: 3600,
    coverUrl:
      "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio1.mp3",
    seriesId: "1",
    plays: 1250,
    liked: true,
    followers: 15400,
    views: 45600,
    language: "English",
    topic: "Tafsir",
    downloads: 250,
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "2",
    title: "Tafsir Al-Qur'an Series",
    coverUrl:
      "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop",
    language: "Hausa",
    tags: ["Tafsir", "Qur'an", "Islamic Studies"],
    lecturerId: "1",
    followers: 28900,
    views: 120000,
    topic: "Tafsir",
  },
  {
    id: "3",
    title: "Building Good Character",
    durationSec: 3300,
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio3.mp3",
    seriesId: "2",
    plays: 756,
    liked: true,
    followers: 8200,
    views: 23400,
    language: "Yoruba",
    topic: "Faith & Creed",
    downloads: 120,
    createdAt: "2024-03-05T09:15:00Z",
  },
  {
    id: "4",
    title: "Al-Fatiha Recitation",
    durationSec: 180,
    coverUrl: "",
    audioUrl: "https://example.com/audio4.mp3",
    seriesId: "3",
    plays: 2100,
    liked: false,
    followers: 34500,
    views: 89000,
    language: "English",
    topic: "Quran Recitation",
    surah: "Al-Fatiha",
    downloads: 340,
    createdAt: "2024-02-25T11:00:00Z",
  },
  {
    id: "5",
    title: "Ramadan Reflections",
    durationSec: 2400,
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio5.mp3",
    seriesId: "4",
    plays: 1800,
    liked: true,
    followers: 12300,
    views: 34500,
    language: "English",
    topic: "Ramadan",
    downloads: 210,
    createdAt: "2024-03-01T08:30:00Z",
  },
  {
    id: "6",
    title: "Charity in Islam",
    durationSec: 2100,
    coverUrl: "",
    audioUrl: "https://example.com/audio6.mp3",
    seriesId: "5",
    plays: 980,
    liked: false,
    followers: 7800,
    views: 18900,
    language: "Igbo",
    topic: "Charity",
    downloads: 95,
    createdAt: "2024-02-18T14:20:00Z",
  },
  {
    id: "7",
    title: "Al-Baqarah Verses 1-10",
    durationSec: 420,
    coverUrl: "",
    audioUrl: "https://example.com/audio7.mp3",
    seriesId: "6",
    plays: 3400,
    liked: true,
    followers: 56700,
    views: 134000,
    language: "English",
    topic: "Quran Recitation",
    surah: "Al-Baqarah",
    downloads: 450,
    createdAt: "2024-02-10T16:00:00Z",
  },
];

export default function SearchScreen() {
  const { playEpisode } = usePlayerActions();
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
  
  // Sync filters with search hook
  useEffect(() => {
    // Map UI filters to what the hook expects
    setSearchFilters({
      ...filters,
      lecturerId: filters.lecturerId === 'All' ? undefined : filters.lecturerId
    });
  }, [filters, setSearchFilters]);

  // Handle search submission (Enter key or search button)
  const handleSearch = (searchText: string) => {
    setActualSearchQuery(searchText);
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
      const parts = duration.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    };

    // Support both new API fields and legacy fields
    const id = String(lecture.id || lecture.nid || `lecture-${Date.now()}`);
    const title = lecture.mp3_title || lecture.Title || "Untitled Lecture";
    const duration = lecture.mp3_duration || lecture.Duration;
    const audioUrl = lecture.mp3_url || lecture.AudioUrl || '';
    const coverUrl = lecture.lecturer_image || lecture.CoverUrl || '';
    const plays = parseInt(lecture.views || lecture.Plays || "0") || 0;
    const language = lecture.language || lecture.Language || "Unknown";
    const downloads = parseInt(lecture.downloads || lecture.Downloads || "0") || 0;
    const createdAt = lecture.created_at || lecture.CreatedAt || new Date().toISOString();
    // Map lecturer name from various possible fields
    const lecturerName = lecture.lecturer_name || lecture.rpname || lecture.ResourcePerson || undefined;

    return {
      id,
      title,
      durationSec: parseDuration(duration),
      coverUrl,
      audioUrl,
      seriesId: '',
      plays,
      liked: false,
      language,
      downloads,
      createdAt,
      lecturerName,
    };
  };

  const handleItemPress = (item: ExtendedEpisode | ExtendedSeries | SearchLecture) => {
    if ("mp3_title" in item || "nid" in item) {
      const apiItem = item as SearchLecture;
      const lectureId = apiItem.nid || apiItem.id;
      if (lectureId) {
        router.push(`/lecture/${lectureId}`);
      }
      return;
    }

    if ("durationSec" in item) {
      playEpisode(item as Episode);
      return;
    }
  };

  // Combine API results with mock data when no query
  const filteredAndSortedResults = useMemo(() => {
    // If we have a search query and API results, use them
    if (actualSearchQuery && apiResults.length > 0) {
      return apiResults;
    }

    // Otherwise use mock data for demonstration
    let results = [...mockSearchResults];

    // Apply search query filter for mock data
    if (actualSearchQuery && actualSearchQuery.trim()) {
      results = results.filter((item) =>
        item.title.toLowerCase().includes(actualSearchQuery.toLowerCase())
      );
    }

    // Apply language filter
    if (filters.language !== "All") {
      results = results.filter((item) => item.language === filters.language);
    }

    // Apply topic filter
    if (filters.topic !== "All") {
      results = results.filter((item) => item.topic === filters.topic);
    }

    // Apply surah filter when Quran Recitation or Tafsir is selected
    if (["Quran Recitation", "Tafsir"].includes(filters.topic) && filters.surah !== "All") {
      results = results.filter(
        (item) => "surah" in item && item.surah === filters.surah
      );
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case "followers":
          return (b.followers || 0) - (a.followers || 0);
        case "views":
          return (b.views || 0) - (a.views || 0);
        case "a-z":
          return a.title.localeCompare(b.title);
        case "z-a":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return results;
  }, [actualSearchQuery, apiResults, filters]);

  const getItemKey = (item: ExtendedEpisode | ExtendedSeries | SearchLecture, index: number) => {
    // Generate a stable, unique key for FlatList
    let uniqueKey = "";

    // Check if it's an API lecture (has mp3_title or nid)
    if ('mp3_title' in item || 'nid' in item) {
      // API result - support both new and legacy field names
      const apiItem = item as SearchLecture;
      uniqueKey = `api-${apiItem.id || apiItem.nid}-${index}`;
    } else if ("durationSec" in item) {
      // Mock episode
      const episode = item as ExtendedEpisode;
      uniqueKey = `mock-${episode.id}-${index}`;
    } else {
      // Mock series
      const series = item as ExtendedSeries;
      uniqueKey = `mock-${series.id}-${index}`;
    }

    return uniqueKey;
  };

  const renderSearchResult = (item: ExtendedEpisode | ExtendedSeries | SearchLecture, index: number) => {
    let metaValue = "";
    let data: Episode | Series;
    let isApiLecture = false;

    // Check if it's an API lecture (has mp3_title or nid)
    if ('mp3_title' in item || 'nid' in item) {
      // API result - support both new and legacy field names
      const apiItem = item as SearchLecture;
      const resourcePerson = apiItem.lecturer_name || apiItem.ResourcePerson || "Unknown Scholar";
      const plays = parseInt(apiItem.views || apiItem.Plays || "0").toLocaleString();
      metaValue = `${resourcePerson} • ${plays} plays`;
      data = convertToEpisode(apiItem);
      isApiLecture = true;
    } else if ("durationSec" in item) {
      // Mock episode
      const episode = item as ExtendedEpisode;
      metaValue = `${episode.views?.toLocaleString() || 0} views • ${episode.language || "Unknown"}`;
      data = episode as Episode;
    } else {
      // Mock series
      const series = item as ExtendedSeries;
      metaValue = `${series.followers?.toLocaleString() || 0} followers • ${series.language || "Unknown"}`;
      data = series as Series;
    }

    return (
      <View style={tw`mb-4`}>
        <Card
          variant="landscape"
          data={data}
          onPress={() => handleItemPress(item)}
          playOnPress={false}
          showTime={"durationSec" in item || isApiLecture}
          showMeta={true}
          metaValue={metaValue}
          showBadge={!("durationSec" in item) && !isApiLecture}
          badgeText="DN"
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={tw`flex-1 items-center justify-center py-20 px-6`}>
      <Ionicons
        name="search"
        size={56}
        color="#6B7280"
        style={tw`mb-6`}
        accessibilityLabel="Search icon"
      />
      <Text
        style={tw`text-white text-xl font-semibold mb-3 text-center`}
        accessibilityRole="header"
      >
        {error
          ? "Something went wrong"
          : actualSearchQuery || hasActiveFilters()
            ? "No results found"
            : "Discover Islamic content"}
      </Text>
      <Text
        style={tw`text-[#9CA3AF] text-center text-base leading-6 max-w-sm`}
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
    <SafeAreaView style={tw`flex-1 bg-[#0A0A0F]`}>
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
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Page Title */}
          <Text style={tw`text-white text-2xl font-bold tracking-tight`}>
            Search
          </Text>
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={tw`flex-row items-center px-4 py-2.5 bg-[#1F2937] rounded-full min-h-[44px]`}
          onPress={toggleFilters}
          accessibilityLabel="Toggle filters"
          accessibilityRole="button"
        >
          <Ionicons name="options" size={18} color="#FFFFFF" />
          <Text style={tw`text-white text-sm ml-2 font-medium`}>Filter</Text>
          {getActiveFilterCount() > 0 && (
            <View
              style={tw`bg-[#C6FF00] w-5 h-5 rounded-full items-center justify-center ml-2`}
            >
              <Text style={tw`text-black text-xs font-bold`}>
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
          onMicPress={() => console.log("Voice search")}
        />
      </View>

      {/* Sort Dropdown */}
      <View style={tw`px-5 mb-5`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-white text-lg font-semibold`}>
            {loading ? "Searching..." : `${filteredAndSortedResults.length} Results`}
          </Text>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-white text-sm font-medium mr-3`}>Sort by</Text>
            <View style={tw`min-w-32`}>
              <Dropdown
                options={sortOptions}
                selectedValue={filters.sortBy}
                onSelect={(value) => updateFilter("sortBy", value as SortOption)}
                placeholder="Select"
              />
            </View>
          </View>
        </View>
      </View>

      <FlatList
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        // Extra bottom padding so the last search results clear the mini-player
        contentContainerStyle={tw`pb-40`}
        data={
          loading && actualSearchQuery && filteredAndSortedResults.length === 0
            ? []
            : filteredAndSortedResults
        }
        keyExtractor={(item, index) => getItemKey(item, index)}
        renderItem={({ item, index }) => (
          <View style={tw`px-5`}>
            {renderSearchResult(item, index)}
          </View>
        )}
        ListHeaderComponent={
          showFilters ? (
            <View
              style={tw`bg-[#111827] border-t border-[rgba(255,255,255,0.1)] pt-6 pb-4 mb-6 mx-1 rounded-t-xl`}
            >
              {/* Filter Header */}
              <View style={tw`flex-row items-center justify-between px-5 mb-6`}>
                <Text style={tw`text-white text-xl font-bold`}>Filters</Text>
                {hasActiveFilters() && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    style={tw`px-3 py-1 bg-[#1F2937] rounded-lg min-h-[44px] justify-center`}
                  >
                    <Text style={tw`text-[#C6FF00] text-sm font-semibold`}>
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
                options={["All", ...lecturerCards.map(l => l.name)]}
                selectedValue={
                  filters.lecturerId 
                    ? lecturerCards.find(l => l.id === filters.lecturerId)?.name || "All" 
                    : "All"
                }
                onSelect={(name) => {
                  const lecturer = lecturerCards.find(l => l.name === name);
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
          ) : null
        }
        ListEmptyComponent={
          loading && actualSearchQuery ? (
            <View style={tw`px-5`}>
              {[...Array(5)].map((_, index) => (
                <CardSkeleton key={`skeleton-${index}`} variant="landscape" style={tw`mb-4`} />
              ))}
            </View>
          ) : (
            <View style={tw`px-5`}>{renderEmptyState()}</View>
          )
        }
        ListFooterComponent={
          filteredAndSortedResults.length > 0 ? (
            <View style={tw`px-5`}>
              {/* Load More Indicator */}
              {hasMore && actualSearchQuery && (
                <View style={tw`py-6`}>
                  {loading ? (
                    <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
                  ) : null}
                </View>
              )}

              {/* Pagination Info */}
              {actualSearchQuery && totalPages > 0 && (
                <View style={tw`py-4 items-center`}>
                  <Text style={tw`text-[#9CA3AF] text-sm`}>
                    Page {currentPage} of {totalPages} • {filteredAndSortedResults.length} of {totalResults} results
                  </Text>
                </View>
              )}
            </View>
          ) : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasMore && !loading && actualSearchQuery) {
            loadMore();
          }
        }}
      />
    </SafeAreaView>
  );
}
