 import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dropdown } from "../../src/components/atoms/Dropdown";
import { Skeleton } from "../../src/components/atoms/Skeleton";
import { Card } from "../../src/components/molecules/Card";
import { FilterSection } from "../../src/components/molecules/FilterSection";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { Surah, surahs } from "../../src/data/surahs";
import { usePlayerStore } from "../../src/stores/playerStore";
import { searchLectures, searchAllContent } from "../../src/services/search";
import tw from "../../src/theme/twrnc";
import {
  Language,
  SearchFilters,
  SortOption,
  Topic,
} from "../../src/types/search";
import { Episode, Series } from "../../src/types/types";

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

interface ExtendedEpisode extends Episode {
  followers?: number;
  views?: number;
  language: Language;
  topic?: Topic;
  surah?: string;
}

interface ExtendedSeries extends Series {
  followers?: number;
  views?: number;
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
    language: "English",
    downloads: 0,
    createdAt: "",
    followers: 15400,
    views: 45600,
    topic: "Tafsir",
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
    language: "Yoruba",
    downloads: 0,
    createdAt: "",
    followers: 8200,
    views: 23400,
    topic: "Faith & Creed",
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
    language: "English",
    downloads: 0,
    createdAt: "",
    followers: 34500,
    views: 89000,
    topic: "Quran Recitation",
    surah: "Al-Fatiha",
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
    language: "English",
    downloads: 0,
    createdAt: "",
    followers: 12300,
    views: 34500,
    topic: "Ramadan",
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
    language: "Igbo",
    downloads: 0,
    createdAt: "",
    followers: 7800,
    views: 18900,
    topic: "Charity",
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
    language: "English",
    downloads: 0,
    createdAt: "",
    followers: 56700,
    views: 134000,
    topic: "Quran Recitation",
    surah: "Al-Baqarah",
  },
];

export default function SearchScreen() {
  const { playEpisode } = usePlayerStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<(ExtendedEpisode | ExtendedSeries)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    language: "All",
    topic: "All",
    surah: "All" as Surah,
    sortBy: "followers",
  } as SearchFilters);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim()) {
      setIsSearching(true);
      try {
        // Use the API search functions
        const [lecturesResults, allContentResults] = await Promise.all([
          searchLectures(query),
          searchAllContent(query)
        ]);

        // Combine and deduplicate results
        const combinedResults = [...lecturesResults, ...allContentResults];
        const uniqueResults = combinedResults.filter((item, index, self) =>
          index === self.findIndex((t) => t.id === item.id)
        );

        // Convert to ExtendedEpisode format for display
        const extendedResults: ExtendedEpisode[] = uniqueResults.map(episode => ({
          ...episode,
          language: episode.language as Language,
          followers: Math.floor(Math.random() * 50000) + 1000, // Mock followers
          views: episode.plays * 2, // Mock views based on plays
          topic: "Faith & Creed" as Topic, // Default topic
        }));

        setSearchResults(extendedResults);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: any
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const clearFilters = () => {
    setFilters({
      language: "All",
      topic: "All",
      surah: "All" as Surah,
      sortBy: "followers",
    } as SearchFilters);
  };

  const handleItemPress = (item: ExtendedEpisode | ExtendedSeries) => {
    if ("durationSec" in item) {
      // It's an episode
      const episode: Episode = {
        id: item.id,
        title: item.title,
        durationSec: item.durationSec,
        coverUrl: item.coverUrl,
        audioUrl: item.audioUrl,
        seriesId: item.seriesId,
        plays: item.plays,
        liked: item.liked,
        language: item.language,
        downloads: item.downloads,
        createdAt: item.createdAt,
      };
      playEpisode(episode);
    } else {
      // It's a series
      console.log("Series pressed:", item.title);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    // Only show results when we have API results or no search query
    if (searchQuery.trim() && searchResults.length === 0) {
      return []; // Show loading skeleton instead
    }

    let results = searchQuery.trim() ? [...searchResults] : [...mockSearchResults];

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
  }, [searchQuery, filters, searchResults]);

  const renderSearchResult = (item: ExtendedEpisode | ExtendedSeries) => {
    const metaValue =
      "durationSec" in item
        ? `${item.views?.toLocaleString() || 0} views • ${item.language}`
        : `${item.followers?.toLocaleString() || 0} followers • ${
            item.language
          }`;

    return (
      <View key={item.id} style={tw`mb-4`}>
        <Card
          variant="landscape"
          data={item}
          onPress={() => handleItemPress(item)}
          showTime={"durationSec" in item}
          showMeta={true}
          metaValue={metaValue}
          showBadge={!("durationSec" in item)}
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
        {searchQuery || hasActiveFilters()
          ? "No results found"
          : "Discover Islamic content"}
      </Text>
      <Text
        style={tw`text-[#9CA3AF] text-center text-base leading-6 max-w-sm`}
        accessibilityLabel={
          searchQuery || hasActiveFilters()
            ? "No results found. Try adjusting your search or filters"
            : "Search for lectures, Quranic recitations, and Islamic teachings"
        }
      >
        {searchQuery || hasActiveFilters()
          ? "Try adjusting your search terms or clearing some filters to find what you're looking for"
          : "Search for lectures, Quranic recitations, and Islamic teachings from trusted scholars"}
      </Text>
    </View>
  );

  const hasActiveFilters = () => {
    return (
      filters.language !== "All" ||
      filters.topic !== "All" ||
      (["Quran Recitation", "Tafsir"].includes(filters.topic) &&
        filters.surah !== "All")
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.language !== "All") count++;
    if (filters.topic !== "All") count++;
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
        <Text style={tw`text-white text-3xl font-bold tracking-tight`}>
          Search
        </Text>

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
          onSearch={handleSearch}
          onMicPress={() => console.log("Voice search")}
        />
      </View>

      {/* Sort Dropdown */}
      <View style={tw`px-5 mb-5`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-white text-lg font-semibold`}>
            {isSearching ? 'Searching...' : searchQuery.trim() && searchResults.length === 0 ? 'No results found' : `${filteredAndSortedResults.length} Results`}
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

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-20`}
      >
        {/* Filters */}
        {showFilters && (
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

            {/* Surah Filter - show when Quran Recitation or Tafsir is selected */}
            {["Quran Recitation", "Tafsir"].includes(filters.topic) && (
              <FilterSection
                title="Surah"
                options={surahs}
                selectedValue={filters.surah || "All"}
                onSelect={(value) => updateFilter("surah", value)}
                searchable={true}
              />
            )}
          </View>
        )}

        {/* Results */}
        <View style={tw`px-5`}>
          {isSearching ? (
            // Show skeleton loading when searching
            Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={tw`mb-4`}>
                <View style={tw`flex-row items-center mb-3`}>
                  <Skeleton width={60} height={60} borderRadius={8} style={tw`mr-3`} />
                  <View style={tw`flex-1`}>
                    <Skeleton width="80%" height={18} style={tw`mb-2`} />
                    <Skeleton width="60%" height={14} />
                  </View>
                </View>
                {index < 4 && <View style={tw`h-px bg-gray-800 my-4`} />}
              </View>
            ))
          ) : filteredAndSortedResults.length > 0 ? (
            filteredAndSortedResults.map(renderSearchResult)
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
