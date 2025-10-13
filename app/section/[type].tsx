import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip, Skeleton, Text } from "../../src/components/atoms";
import { Card } from "../../src/components/molecules/Card";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { getRecentLectures, getTrendingLectures, getFeaturedLectures } from "../../src/services/media";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";
import { getRandomScholar } from "../../src/utils/scholarNames";

// Mock data - in a real app this would come from an API
const mockEpisodes: Episode[] = [
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
    language: "Hausa",
    downloads: 890,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    title: "Understanding Surah Al-Fatiha",
    durationSec: 2700,
    coverUrl:
      "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio2.mp3",
    seriesId: "1",
    plays: 980,
    liked: false,
    language: "English",
    downloads: 654,
    createdAt: "2024-01-10T14:20:00Z",
  },
  {
    id: "3",
    title: "Building Good Character in Daily Life",
    durationSec: 3300,
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio3.mp3",
    seriesId: "2",
    plays: 756,
    liked: true,
    language: "Yoruba",
    downloads: 432,
    createdAt: "2024-01-08T09:15:00Z",
  },
  {
    id: "4",
    title: "The Rights of Women in Islamic Law",
    durationSec: 4200,
    coverUrl:
      "https://images.unsplash.com/photo-1487412720507-e7abf03fe3bf?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio4.mp3",
    seriesId: "3",
    plays: 892,
    liked: false,
    language: "English",
    downloads: 567,
    createdAt: "2024-01-12T16:45:00Z",
  },
  {
    id: "5",
    title: "The Golden Age of Islamic Civilization",
    durationSec: 4800,
    coverUrl:
      "https://images.unsplash.com/photo-1447069388813-9e89e38406f7?w=300&h=300&fit=crop",
    audioUrl: "https://example.com/audio5.mp3",
    seriesId: "4",
    plays: 654,
    liked: true,
    language: "Hausa",
    downloads: 789,
    createdAt: "2024-01-05T11:30:00Z",
  },
];

const mockSeries: Series[] = [
  {
    id: "1",
    title: "Tafsir Al-Qur'an",
    coverUrl:
      "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop",
    language: "Hausa",
    tags: ["Tafsir", "Qur'an", "Islamic Studies"],
    lecturerId: "1",
  },
  {
    id: "2",
    title: "Akhlaq & Character Building",
    coverUrl: "",
    language: "English",
    tags: ["Akhlaq", "Character", "Ethics"],
    lecturerId: "2",
  },
  {
    id: "3",
    title: "Women in Islam",
    coverUrl: "",
    language: "Yoruba",
    tags: ["Women", "Islamic Rights", "Empowerment"],
    lecturerId: "3",
  },
  {
    id: "4",
    title: "Islamic History & Civilization",
    coverUrl:
      "https://images.unsplash.com/photo-1447069388813-9e89e38406f7?w=300&h=300&fit=crop",
    language: "Hausa",
    tags: ["History", "Civilization", "Islamic Heritage"],
    lecturerId: "4",
  },
];

// Generate more data for sections
const generateSectionData = (type: string) => {
  const baseEpisodes = [...mockEpisodes];
  const baseSeries = [...mockSeries];
  const languages = ["Hausa", "English", "Yoruba", "Arabic"];

  // Create more episodes by duplicating and modifying
  const moreEpisodes = Array.from({ length: 20 }, (_, i) => {
    const baseEpisode = baseEpisodes[i % baseEpisodes.length];
    const randomLanguage = languages[i % languages.length];
    const randomPlays = Math.floor(Math.random() * 2000) + 100;
    const randomDownloads = Math.floor(Math.random() * 1000) + 50;
    const randomDate = new Date(2024, 0, Math.floor(Math.random() * 30) + 1);

    return {
      ...baseEpisode,
      id: `${type}-episode-${i + 1}`,
      title: `${baseEpisode.title} ${i + 1}`,
      language: randomLanguage,
      plays: randomPlays,
      downloads: randomDownloads,
      createdAt: randomDate.toISOString(),
    };
  });

  // Create more series by duplicating and modifying
  const moreSeries = Array.from({ length: 20 }, (_, i) => ({
    ...baseSeries[i % baseSeries.length],
    id: `${type}-series-${i + 1}`,
    title: `${baseSeries[i % baseSeries.length].title} ${i + 1}`,
  }));

  return { episodes: moreEpisodes, series: moreSeries };
};

const getSectionInfo = (type: string) => {
  switch (type) {
    case "featured-lectures":
      return {
        title: "Featured Lectures",
        description:
          "Handpicked content curated by our scholars for your spiritual growth and learning",
        count: 20,
        data: [], // Will be loaded dynamically
        variant: "section" as const,
      };
    case "recently-posted":
      return {
        title: "Recently Posted",
        description:
          "Latest content from our scholars, fresh insights and teachings",
        count: 20,
        data: [], // Will be loaded dynamically
        variant: "section" as const,
      };
    case "recently-played":
      return {
        title: "Recently Played",
        description: "Continue where you left off with your learning journey",
        count: 20,
        data: generateSectionData(type).episodes,
        variant: "section" as const,
      };
    case "trending":
      return {
        title: "Trending",
        description: "Most popular and engaging content loved by our community",
        count: 20,
        data: [], // Will be loaded dynamically
        variant: "section" as const,
      };
    case "quran-recitations":
      return {
        title: "Quran Recitations",
        description: "Beautiful recitations and tafsir of the Holy Quran",
        count: 20,
        data: [], // Will be loaded dynamically
        variant: "section" as const,
      };
    default:
      return {
        title: "Section",
        description: "Explore our collection of Islamic content",
        count: 0,
        data: [],
        variant: "section" as const,
      };
  }
};

type SortOption = "recent" | "most-played" | "downloads";
type LanguageFilter = "all" | "hausa" | "english" | "yoruba" | "arabic";

export default function SectionScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();

  const sectionInfo = getSectionInfo(type || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [dynamicData, setDynamicData] = useState<Episode[] | Series[]>([]);
  const [loading, setLoading] = useState(false);

  // Show filters only for trending and recently-posted sections (not for featured-lectures since it's series data)
  const showFilters = type === "trending" || type === "recently-posted";

  // Load dynamic data for recently-posted, trending, featured-lectures, and quran-recitations sections
  useEffect(() => {
    if (type === "recently-posted") {
      const loadRecentLectures = async () => {
        setLoading(true);
        try {
          // Load multiple pages to get more content
          const allLectures: Episode[] = [];
          for (let page = 1; page <= 5; page++) {
            const lectures = await getRecentLectures(page);
            allLectures.push(...lectures);
            if (lectures.length === 0) break; // No more data
          }
          setDynamicData(allLectures);
        } catch (error) {
          console.error('Failed to load recent lectures:', error);
          setDynamicData([]);
        } finally {
          setLoading(false);
        }
      };
      loadRecentLectures();
    } else if (type === "trending") {
      const loadTrendingLectures = async () => {
        setLoading(true);
        try {
          // Load a large batch of trending lectures (100 items)
          const lectures = await getTrendingLectures(6, 1, 100);
          setDynamicData(lectures);
        } catch (error) {
          console.error('Failed to load trending lectures:', error);
          setDynamicData([]);
        } finally {
          setLoading(false);
        }
      };
      loadTrendingLectures();
    } else if (type === "featured-lectures") {
      const loadFeaturedLectures = async () => {
        setLoading(true);
        try {
          // Load featured albums/series
          const series = await getFeaturedLectures(7, 1, 20);
          setDynamicData(series);
        } catch (error) {
          console.error('Failed to load featured lectures:', error);
          setDynamicData([]);
        } finally {
          setLoading(false);
        }
      };
      loadFeaturedLectures();
    } else {
      // For other sections, set loading to false immediately
      setLoading(false);
    }
  }, [type]);

  // Filter and sort data based on search query, language, and sort option
  const filteredData = useMemo(() => {
    let data = (type === "recently-posted" || type === "trending" || type === "featured-lectures") ? [...dynamicData] : [...sectionInfo.data];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => {
        const title = item.title.toLowerCase();
        const metaValue =
          "durationSec" in item ? getRandomScholar(item.id) : "";

        // Search in title, author, and tags if available
        const titleMatch = title.includes(query);
        const authorMatch = metaValue.toLowerCase().includes(query);

        // For episodes, also search in duration (e.g., "1 hour", "30 min")
        let durationMatch = false;
        if ("durationSec" in item) {
          const episode = item as Episode;
          const hours = Math.floor(episode.durationSec / 3600);
          const minutes = Math.floor((episode.durationSec % 3600) / 60);

          if (hours > 0) {
            durationMatch =
              `${hours} hour`.includes(query) || `${hours} hr`.includes(query);
          }
          if (minutes > 0) {
            durationMatch =
              durationMatch ||
              `${minutes} min`.includes(query) ||
              `${minutes} minute`.includes(query);
          }
        }

        return titleMatch || authorMatch || durationMatch;
      });
    }

    // Apply language filter (only for episodes and only if filters are shown)
    if (showFilters && selectedLanguage !== "all") {
      data = data.filter((item) => {
        if ("language" in item) {
          const episode = item as Episode;
          return episode.language.toLowerCase() === selectedLanguage;
        }
        return true;
      });
    }

    // Apply sorting (only for episodes and only if filters are shown)
    if (showFilters && data.length > 0 && "durationSec" in data[0]) {
      const episodes = data as Episode[];
      switch (sortBy) {
        case "most-played":
          episodes.sort((a, b) => b.plays - a.plays);
          break;
        case "downloads":
          episodes.sort((a, b) => b.downloads - a.downloads);
          break;
        case "recent":
        default:
          episodes.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
      }
      data = episodes;
    }

    return data;
  }, [sectionInfo.data, searchQuery, selectedLanguage, sortBy, showFilters, dynamicData, type]);

  const handleSeriesPress = (series: Series) => {
    console.log("Series pressed:", series.title);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
    >
      {/* Header */}
      <View
        style={[
          tw`px-6 pt-2 pb-4`,
          {
            backgroundColor: designTokens.colors.system.background.primary,
          },
        ]}
      >
        {/* Navigation Bar */}
        <View style={tw`flex-row items-center mb-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-4 p-1`}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.6}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={designTokens.colors.brand.primary}
            />
          </TouchableOpacity>
          <Text variant="title1" color="label" style={tw`font-semibold`}>
            {sectionInfo.title}
          </Text>
        </View>

        {/* Description */}
        <Text
          variant="body"
          color="secondaryLabel"
          style={tw`mb-3 leading-6`}
          numberOfLines={2}
        >
          {sectionInfo.description}
        </Text>

        {/* Stats */}
        <View style={tw`flex-row items-center`}>
          <View
            style={[
              tw`px-3 py-1.5 rounded-full mr-3`,
              {
                backgroundColor: designTokens.colors.system.fill.tertiary,
              },
            ]}
          >
            <Text
              variant="caption1"
              color="secondaryLabel"
              style={tw`font-medium`}
            >
              {(type === "recently-posted" || type === "trending" || type === "featured-lectures") ? (loading ? "Loading..." : `${filteredData.length} ${type === "featured-lectures" ? "albums" : "lectures"}`) : `${sectionInfo.count} lectures`}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar and Filters */}
      <View
        style={[
          tw`pb-4`,
          {
            backgroundColor: designTokens.colors.system.background.primary,
            borderBottomWidth: 1,
            borderBottomColor: designTokens.colors.system.separator.primary,
          },
        ]}
      >
        <View style={tw`px-6`}>
          <SearchBar
            placeholder={`Search in ${sectionInfo.title.toLowerCase()}`}
            onSearch={handleSearch}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Search Results Count */}
          {searchQuery.trim() && (
            <View style={tw`mt-3 flex-row items-center justify-between`}>
              <Text variant="caption1" color="secondaryLabel">
                {filteredData.length} of {(type === "recently-posted" || type === "trending" || type === "featured-lectures") ? filteredData.length : sectionInfo.count} results
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={tw`px-3 py-1`}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <Text variant="caption1" color="brand" style={tw`font-medium`}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Filters and Sorting (only for trending) */}
        {showFilters && (
          <View style={tw`mt-4 px-6`}>
            {/* Filter Header */}
            <TouchableOpacity
              onPress={() => setFiltersExpanded(!filtersExpanded)}
              style={tw`flex-row items-center justify-between pb-3`}
              accessibilityLabel="Toggle filters"
              accessibilityRole="button"
            >
              <View style={tw`flex-row items-center`}>
                <Text
                  variant="subheadline"
                  color="label"
                  weight="semibold"
                  style={tw`mr-2`}
                >
                  Filters & Sorting
                </Text>
                <View
                  style={[
                    tw`px-2 py-1 rounded-full`,
                    {
                      backgroundColor: designTokens.colors.system.fill.tertiary,
                    },
                  ]}
                >
                  <Text
                    variant="caption1"
                    color="secondaryLabel"
                    style={tw`font-medium`}
                  >
                    {selectedLanguage !== "all" ? "1" : "0"} active
                  </Text>
                </View>
              </View>
              <Ionicons
                name={filtersExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={designTokens.colors.system.label.secondary}
              />
            </TouchableOpacity>

            {/* Expandable Filter Content */}
            {filtersExpanded && (
              <View style={tw`pb-2`}>
                {/* Inline Filters Layout */}
                <View style={tw`flex-row items-start justify-between`}>
                  {/* Language Filter */}
                  <View style={tw`flex-1`}>
                    <Text
                      variant="caption1"
                      color="secondaryLabel"
                      weight="medium"
                      style={tw`mb-2`}
                    >
                      Language
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw`gap-2`}
                    >
                      {[
                        { key: "all", label: "All" },
                        { key: "hausa", label: "Hausa" },
                        { key: "english", label: "English" },
                        { key: "yoruba", label: "Yoruba" },
                        { key: "arabic", label: "Arabic" },
                      ].map((language) => (
                        <Chip
                          key={language.key}
                          label={language.label}
                          variant="primary"
                          selected={selectedLanguage === language.key}
                          onPress={() =>
                            setSelectedLanguage(language.key as LanguageFilter)
                          }
                        />
                      ))}
                    </ScrollView>
                  </View>

                  {/* Sort Options */}
                  <View style={tw`flex-1 ml-4`}>
                    <Text
                      variant="caption1"
                      color="secondaryLabel"
                      weight="medium"
                      style={tw`mb-2`}
                    >
                      Sort by
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw`gap-2`}
                    >
                      {[
                        { key: "recent", label: "Recent" },
                        { key: "most-played", label: "Most Played" },
                        { key: "downloads", label: "Downloads" },
                      ].map((sort) => (
                        <Chip
                          key={sort.key}
                          label={sort.label}
                          variant="primary"
                          selected={sortBy === sort.key}
                          onPress={() => setSortBy(sort.key as SortOption)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Content with Dynamic Spacing */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={[
          tw`pb-8`,
          { paddingBottom: 80 } // Add extra padding for mini player
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          // Show skeleton while loading
          <View
            style={[
              tw`px-6`,
              {
                paddingTop: showFilters
                  ? designTokens.spacing.md
                  : designTokens.spacing.lg,
              },
            ]}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={`skeleton-${index}`} style={tw`mb-4`}>
                <View
                  style={[
                    tw`p-4 rounded-xl`,
                    {
                      backgroundColor: designTokens.colors.system.background.secondary,
                      shadowColor: designTokens.colors.system.label.primary,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    },
                  ]}
                >
                  <View style={tw`flex-row items-center`}>
                    {/* Thumbnail skeleton */}
                    <Skeleton
                      width={64}
                      height={64}
                      borderRadius={8}
                      style={tw`mr-4`}
                    />
                    {/* Content skeleton */}
                    <View style={tw`flex-1`}>
                      {/* Title skeleton */}
                      <Skeleton
                        height={16}
                        width="80%"
                        style={tw`mb-2`}
                      />
                      {/* Meta skeleton */}
                      <Skeleton
                        height={12}
                        width="60%"
                        style={tw`mb-1`}
                      />
                      {/* Duration skeleton */}
                      <Skeleton
                        height={12}
                        width="40%"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : filteredData.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center py-20`}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                {
                  backgroundColor: designTokens.colors.system.fill.quaternary,
                },
              ]}
            >
              <Ionicons
                name={searchQuery.trim() ? "search-outline" : "library-outline"}
                size={32}
                color={designTokens.colors.system.label.tertiary}
              />
            </View>
            <Text
              variant="title2"
              color="label"
              style={tw`font-semibold mb-2 text-center`}
            >
              {searchQuery.trim() ? "No results found" : "No content available"}
            </Text>
            <Text
              variant="subheadline"
              color="secondaryLabel"
              style={tw`text-center px-8`}
            >
              {searchQuery.trim()
                ? "Try adjusting your search terms or browse all available content"
                : "This section is currently empty"}
            </Text>
          </View>
        ) : (
          <View
            style={[
              tw`px-6`,
              {
                paddingTop: showFilters
                  ? designTokens.spacing.md
                  : designTokens.spacing.lg,
              },
            ]}
          >
            {filteredData.map((item, index) => (
              <View key={`${item.id}-${index}`}>
                {type === "featured-lectures" ? (
                  // For featured lectures (series), use square cards
                  <View style={tw`items-center mb-6`}>
                    <View
                      style={[
                        tw`p-4 rounded-xl`,
                        {
                          backgroundColor:
                            designTokens.colors.system.background.secondary,
                          shadowColor: designTokens.colors.system.label.primary,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.04,
                          shadowRadius: 4,
                          elevation: 1,
                        },
                      ]}
                    >
                      <Card
                        variant="square"
                        data={item as Series}
                        onPress={() =>
                          handleSeriesPress(item as Series)
                        }
                        showBadge={false}
                      />
                      <Text
                        variant="caption1"
                        color="secondaryLabel"
                        style={tw`mt-2 text-center`}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </View>
                ) : (
                  // For other sections (episodes), use section cards
                  <Card
                    variant="section"
                    data={item as Episode}
                    showTime={true}
                    showMeta={true}
                    metaValue={getRandomScholar(item.id)}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
