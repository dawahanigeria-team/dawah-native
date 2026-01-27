import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, TouchableOpacity, UIManager, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Chip, Text } from "../../src/components/atoms";
import { Card } from "../../src/components/molecules/Card";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { useQuranAlbums } from "../../src/hooks/useQuranAlbums";
import { useRecentlyPlayedLectures } from "../../src/hooks/useRecentlyPlayedLectures";
import { useTrending } from "../../src/hooks/useTrending";
import { useVideos } from "../../src/hooks/useVideos";
import { QuranAlbum } from "../../src/services/api/quran.api";

import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, Series, Video } from "../../src/types/types";

const getSectionInfo = (type: string) => {
  switch (type) {
    case "featured-lectures":
      return {
        title: "Featured Lectures",
        description:
          "Handpicked content curated by our scholars for your spiritual growth and learning",
        count: 0,
        data: [],
        variant: "section" as const,
      };
    case "recently-posted":
      return {
        title: "Recently Posted",
        description:
          "Latest content from our scholars, fresh insights and teachings",
        count: 0,
        data: [],
        variant: "section" as const,
      };
    case "recently-played":
      return {
        title: "Recently Played",
        description: "Continue where you left off with your learning journey",
        count: 0,
        data: [],
        variant: "section" as const,
      };
    case "trending":
      return {
        title: "Trending",
        description: "Most popular and engaging content loved by our community",
        count: 0,
        data: [],
        variant: "section" as const,
      };
    case "quran-recitations":
      return {
        title: "Quran Reciters",
        description: "Discover renowned Quran reciters and their beautiful recitations",
        count: 0,
        data: [],
        variant: "quran" as const,
      };
    case "videos":
      return {
        title: "Featured Videos",
        description: "Watch inspiring video content from our scholars",
        count: 0,
        data: [],
        variant: "videos" as const,
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
  const canUseFlashList = Boolean(UIManager.getViewManagerConfig?.('AutoLayoutView'));
  const ListComponent = canUseFlashList ? FlashList : FlatList;

  // Fetch trending data if this is the trending or recently-posted section
  const trendingParams = (type === "trending" || type === "recently-posted") ? { page: 1, limit: 20 } : undefined;
  console.log(`📱 SectionScreen render - type: ${type}, trendingParams:`, trendingParams);

  const {
    lectures: trendingLectures,
    loading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
    loadMore: loadMoreTrending,
    hasMore: hasMoreTrending,
    isLoadingMore: isLoadingMoreTrending,
  } = useTrending(trendingParams);

  console.log(`📊 useTrending values - lectures: ${trendingLectures.length}, loading: ${trendingLoading}, hasMore: ${hasMoreTrending}, isLoadingMore: ${isLoadingMoreTrending}`);

  // Fetch recently played lectures if this is the recently-played section
  const {
    lectures: recentlyPlayedLectures,
    loading: recentlyPlayedLoading,
    error: recentlyPlayedError,
  } = useRecentlyPlayedLectures(type === "recently-played" ? 50 : 0);

  console.log(`🕐 useRecentlyPlayed values - lectures: ${recentlyPlayedLectures.length}, loading: ${recentlyPlayedLoading}`);

  // Fetch Quran albums if this is the quran-recitations section
  const quranParams = type === "quran-recitations" ? { page: 1, limit: 20 } : undefined;

  const {
    albums: quranAlbums,
    loading: quranLoading,
    error: quranError,
    refetch: refetchQuran,
    loadMore: loadMoreQuran,
    hasMore: hasMoreQuran,
    isLoadingMore: isLoadingMoreQuran,
  } = useQuranAlbums(quranParams);

  console.log(`📖 useQuranAlbums values - albums: ${quranAlbums.length}, loading: ${quranLoading}, hasMore: ${hasMoreQuran}, isLoadingMore: ${isLoadingMoreQuran}`);

  // Fetch videos if this is the videos section
  const videosParams = type === "videos" ? { page: 1, limit: 20 } : undefined;

  const {
    videos,
    loading: videosLoading,
    error: videosError,
    refetch: refetchVideos,
    loadMore: loadMoreVideos,
    hasMore: hasMoreVideos,
    isLoadingMore: isLoadingMoreVideos,
  } = useVideos(videosParams);

  console.log(`🎥 useVideos values - videos: ${videos.length}, loading: ${videosLoading}, hasMore: ${hasMoreVideos}, isLoadingMore: ${isLoadingMoreVideos}`);

  const sectionInfo = getSectionInfo(type || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const showFilters = type === "trending";

  // Determine which data source to use based on section type
  const rawData =
    type === "trending" ? trendingLectures :
    type === "recently-posted" ? trendingLectures :
    type === "recently-played" ? recentlyPlayedLectures :
    type === "quran-recitations" ? quranAlbums :
    type === "videos" ? videos :
    sectionInfo.data;

  const isLoading =
    type === "trending" ? trendingLoading :
    type === "recently-posted" ? trendingLoading :
    type === "recently-played" ? recentlyPlayedLoading :
    type === "quran-recitations" ? quranLoading :
    type === "videos" ? videosLoading :
    false;

  const hasError =
    type === "trending" ? trendingError :
    type === "recently-posted" ? trendingError :
    type === "recently-played" ? recentlyPlayedError :
    type === "quran-recitations" ? quranError :
    type === "videos" ? videosError :
    null;

  const refetch = useMemo(() => {
    if (type === "trending" || type === "recently-posted") return refetchTrending;
    if (type === "quran-recitations") return refetchQuran;
    if (type === "videos") return refetchVideos;
    return () => Promise.resolve();
  }, [type, refetchTrending, refetchQuran, refetchVideos]);

  const loadMore = useMemo(() => {
    if (type === "trending" || type === "recently-posted") return loadMoreTrending;
    if (type === "quran-recitations") return loadMoreQuran;
    if (type === "videos") return loadMoreVideos;
    return () => Promise.resolve();
  }, [type, loadMoreTrending, loadMoreQuran, loadMoreVideos]);

  const hasMore =
    type === "trending" ? hasMoreTrending :
    type === "recently-posted" ? hasMoreTrending :
    type === "quran-recitations" ? hasMoreQuran :
    type === "videos" ? hasMoreVideos :
    false;

  const isLoadingMore =
    type === "trending" ? isLoadingMoreTrending :
    type === "recently-posted" ? isLoadingMoreTrending :
    type === "quran-recitations" ? isLoadingMoreQuran :
    type === "videos" ? isLoadingMoreVideos :
    false;

  // Filter and sort data based on search query, language, and sort option
  const filteredData = useMemo(() => {
    let data = [...rawData];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => {
        // Handle QuranAlbum type
        if ('name' in item && 'lec_no' in item) {
          const album = item as QuranAlbum;
          return album.name.toLowerCase().includes(query) ||
            album.language.toLowerCase().includes(query);
        }

        // Handle Episode type
        const title = (item as Episode).title?.toLowerCase() || '';
        const metaValue = (item as Episode).lecturerName?.toLowerCase() || '';

        // Search in title, author, and tags if available
        const titleMatch = title.includes(query);
        const authorMatch = metaValue.includes(query);

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
  }, [rawData, searchQuery, selectedLanguage, sortBy, showFilters]);

  const handleSeriesPress = (series: Series) => {
    console.log("Series pressed:", series.title);
  };

  const handleLecturePress = useCallback(
    (episode: Episode) => {
      if (!episode?.id) return;
      router.push(`/lecture/${episode.id}`);
    },
    []
  );

  const handleQuranAlbumPress = useCallback(
    (album: QuranAlbum) => {
      if (!album?.id) return;
      // Navigate to reciter detail page
      router.push(`/quran-reciter/${album.id}`);
    },
    []
  );

  const handleVideoPress = useCallback(
    (video: Video) => {
      if (!video?.id) return;
      // Navigate to video player page
      router.push(`/video/${video.id}`);
    },
    []
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle infinite scroll load more
  const handleLoadMore = useCallback(() => {
    console.log(`🔄 onEndReached triggered - type: ${type}, hasMore: ${hasMore}, isLoadingMore: ${isLoadingMore}`);
    if ((type === "trending" || type === "recently-posted" || type === "quran-recitations" || type === "videos") && hasMore && !isLoadingMore) {
      console.log('✅ Triggering loadMore()');
      loadMore();
    }
  }, [type, hasMore, isLoadingMore, loadMore]);

  // Render item for list
  const renderItem = useCallback(({ item }: { item: Episode | Series | QuranAlbum | Video }) => {
    // Handle Videos
    if (sectionInfo.variant === "videos" && 'youtubeId' in item && 'thumbnailUrl' in item) {
      const video = item as Video;
      return (
        <Card
          variant="section"
          data={{
            id: video.id,
            title: video.title,
            coverUrl: video.thumbnailUrl,
            audioUrl: '',
            seriesId: '',
            durationSec: video.durationSec,
            plays: video.views,
            liked: false,
            language: video.language || '',
            downloads: 0,
            createdAt: video.createdAt,
            lecturerName: video.lecturerName,
          } as Episode}
          onPress={() => handleVideoPress(video)}
          showTime={true}
          showMeta={true}
          metaValue={video.lecturerName || "Unknown"}
          titleNumberOfLines={0}
          metaNumberOfLines={2}
          isVideo={true}
        />
      );
    }

    // Handle Quran albums
    if (sectionInfo.variant === "quran" && 'name' in item && 'lec_no' in item) {
      const album = item as QuranAlbum;
      return (
        <Card
          variant="section"
          data={{
            id: album.id,
            title: album.name,
            coverUrl: album.alb_thumbnail || album.img,
            lecturerName: `${album.lec_no} Surahs`,
            plays: album.views,
            downloads: album.downloads,
            language: album.language,
          } as Episode}
          onPress={() => handleQuranAlbumPress(album)}
          showTime={false}
          showMeta={true}
          metaValue={`${album.lec_no} Surahs • ${album.language}`}
          titleNumberOfLines={0}
          metaNumberOfLines={2}
        />
      );
    }

    // Handle Episodes
    if (sectionInfo.variant === "section") {
      const shouldNavigate = type === "trending" || type === "recently-posted" || type === "recently-played";

      return (
        <Card
          variant="section"
          data={item as Episode}
          onPress={
            shouldNavigate
              ? () => handleLecturePress(item as Episode)
              : undefined
          }
          playOnPress={false}
          showTime={true}
          showMeta={true}
          metaValue={(item as Episode).lecturerName || "Unknown"}
        />
      );
    } else {
      return (
        <View style={tw`items-center mb-6`}>
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
            <Card
              variant="square"
              data={item as unknown as Series}
              onPress={() => handleSeriesPress(item as unknown as Series)}
              showBadge={false}
            />
            <Text
              variant="caption1"
              color="secondaryLabel"
              style={tw`mt-2 text-center`}
              numberOfLines={2}
            >
              {(item as Series).title}
            </Text>
          </View>
        </View>
      );
    }
  }, [handleLecturePress, handleQuranAlbumPress, handleVideoPress, sectionInfo.variant, type]);

  // Render footer (loading indicator) for list
  const renderFooter = useCallback(() => {
    console.log(`🦶 renderFooter - isLoadingMore: ${isLoadingMore}, type: ${type}, hasMore: ${hasMore}`);
    if (!isLoadingMore) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
        <Text variant="caption1" color="secondaryLabel" style={tw`mt-2`}>
          Loading more...
        </Text>
      </View>
    );
  }, [isLoadingMore, type, hasMore]);

  // Empty component for list
  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={tw`flex-1 items-center justify-center py-20`}>
          <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
          <Text style={tw`text-white mt-2`}>Loading {sectionInfo.title.toLowerCase()}...</Text>
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={tw`flex-1 items-center justify-center py-20 px-6`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
              { backgroundColor: designTokens.colors.system.fill.quaternary },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={designTokens.colors.system.label.tertiary}
            />
          </View>
          <Text variant="title3" color="label" style={tw`font-semibold text-center mb-2`}>
            Failed to load {sectionInfo.title.toLowerCase()}
          </Text>
          <Text variant="subheadline" color="secondaryLabel" style={tw`text-center mb-4`}>
            Check your connection and try again
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[
              tw`px-6 py-3 rounded-full`,
              { backgroundColor: designTokens.colors.brand.primary },
            ]}
            accessibilityLabel={`Retry loading ${sectionInfo.title.toLowerCase()}`}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Text
              variant="body"
              style={[
                tw`font-semibold`,
                { color: designTokens.colors.system.background.primary },
              ]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={tw`flex-1 items-center justify-center py-20`}>
        <View
          style={[
            tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
            { backgroundColor: designTokens.colors.system.fill.quaternary },
          ]}
        >
          <Ionicons
            name={searchQuery.trim() ? "search-outline" : "library-outline"}
            size={32}
            color={designTokens.colors.system.label.tertiary}
          />
        </View>
        <Text variant="title2" color="label" style={tw`font-semibold mb-2 text-center`}>
          {searchQuery.trim() ? "No results found" : "No content available"}
        </Text>
        <Text variant="subheadline" color="secondaryLabel" style={tw`text-center px-8`}>
          {searchQuery.trim()
            ? "Try adjusting your search terms or browse all available content"
            : "This section is currently empty"}
        </Text>
      </View>
    );
  }, [isLoading, hasError, searchQuery, refetch, sectionInfo.title]);

  return (
    <SafeAreaView
      style={[
        tw`flex-1 pb-4`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
      edges={["top", "left", "right", "bottom"]}
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
              {type === "trending"
                ? `${trendingLectures.length > 0 ? trendingLectures.length : sectionInfo.count} lectures`
                : type === "recently-posted"
                  ? `${trendingLectures.length > 0 ? trendingLectures.length : sectionInfo.count} lectures`
                  : type === "recently-played"
                    ? `${recentlyPlayedLectures.length > 0 ? recentlyPlayedLectures.length : sectionInfo.count} lectures`
                    : type === "quran-recitations"
                      ? `${quranAlbums.length > 0 ? quranAlbums.length : sectionInfo.count} reciters`
                      : `${sectionInfo.count} lectures`
              }
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
                {filteredData.length} of {sectionInfo.count} results
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
      <ListComponent
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        {...(canUseFlashList ? { estimatedItemSize: 160 } : {})}
        contentContainerStyle={[
          tw`px-6`,
          {
            paddingTop: showFilters
              ? designTokens.spacing.md
              : designTokens.spacing.lg,
            paddingBottom: 80, // Add extra padding for mini player
          },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
