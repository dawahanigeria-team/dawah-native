import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import { useTheme } from "../../src/hooks/useTheme";
import { ramadanApi, RamadanAlbum } from "../../src/services/api/ramadan.api";
import tw from "../../src/theme/twrnc";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

interface RamadanYearHeaderProps {
  colors: ThemeColors;
  yearNum: number;
  totalAlbums: number;
  totalLectures: number;
  languages: string[];
  searchQuery: string;
  selectedLanguage: string;
  languageCounts: Record<string, number>;
  filteredCount: number;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  onLanguageSelect: (language: string) => void;
}

const RamadanYearHeader = React.memo(
  ({
    colors,
    yearNum,
    totalAlbums,
    totalLectures,
    languages,
    searchQuery,
    selectedLanguage,
    languageCounts,
    filteredCount,
    onSearchChange,
    onSearchClear,
    onLanguageSelect,
  }: RamadanYearHeaderProps) => (
    <View>
      {/* Hero Section */}
      <LinearGradient
        colors={[colors.brand.primary + "15", colors.system.background.primary]}
        style={tw`px-4 pt-4 pb-6`}
      >
        {/* Badge */}
        <View
          style={[
            tw`self-center px-4 py-2 rounded-full mb-4 flex-row items-center`,
            { backgroundColor: colors.brand.primary + "30" },
          ]}
        >
          <Ionicons name="book" size={14} color={colors.brand.primary} />
          <Text
            variant="caption1"
            weight="semibold"
            style={[tw`ml-2`, { color: colors.brand.primary }]}
          >
            Tafsir collection
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[
            tw`text-center text-4xl mb-2`,
            {
              color: colors.system.label.primary,
              fontFamily: "System",
              fontWeight: "300",
            },
          ]}
        >
          Ramadan {yearNum}
        </Text>

        {/* Description */}
        <Text
          variant="body"
          color="secondaryLabel"
          style={tw`text-center mb-6`}
        >
          Explore the blessed month&apos;s teachings and reflections
        </Text>

        {/* Stats */}
        <View style={tw`flex-row justify-center items-center`}>
          <View
            style={[
              tw`px-5 py-3 rounded-2xl mr-2`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            <Text
              style={[
                tw`text-2xl text-center`,
                { color: colors.brand.primary, fontWeight: "300" },
              ]}
            >
              {totalAlbums}
            </Text>
            <Text
              variant="caption2"
              color="secondaryLabel"
              style={tw`text-center`}
            >
              Series
            </Text>
          </View>

          <View
            style={[
              tw`px-5 py-3 rounded-2xl mr-2`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            <Text
              style={[
                tw`text-2xl text-center`,
                { color: colors.brand.primary, fontWeight: "300" },
              ]}
            >
              {totalLectures}
            </Text>
            <Text
              variant="caption2"
              color="secondaryLabel"
              style={tw`text-center`}
            >
              Lectures
            </Text>
          </View>

          <View
            style={[
              tw`px-5 py-3 rounded-2xl`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            <Text
              style={[
                tw`text-2xl text-center`,
                { color: colors.brand.primary, fontWeight: "300" },
              ]}
            >
              {languages.length}
            </Text>
            <Text
              variant="caption2"
              color="secondaryLabel"
              style={tw`text-center`}
            >
              Languages
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={tw`px-4 mb-4`}>
        <View
          style={[
            tw`flex-row items-center px-4 py-3 rounded-2xl`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={colors.system.label.tertiary}
          />
          <TextInput
            placeholder="Search by title or lecturer..."
            placeholderTextColor={colors.system.label.tertiary}
            value={searchQuery}
            onChangeText={onSearchChange}
            style={[
              tw`flex-1 ml-3 text-base`,
              { color: colors.system.label.primary },
            ]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={onSearchClear}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.system.label.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Language Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-4 pb-4`}
      >
        {["All", ...languages].map((lang) => {
          const isSelected = selectedLanguage === lang;
          const count = languageCounts[lang] || 0;

          return (
            <TouchableOpacity
              key={lang}
              onPress={() => onLanguageSelect(lang)}
              style={[
                tw`mr-2 px-4 min-h-[44px] rounded-full flex-row items-center`,
                {
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : colors.system.background.secondary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                variant="subheadline"
                weight={isSelected ? "semibold" : "regular"}
                style={{
                  color: isSelected
                    ? colors.brand.onPrimary
                    : colors.system.label.primary,
                }}
              >
                {lang}
              </Text>
              <Text
                variant="caption1"
                style={[
                  tw`ml-1`,
                  {
                    color: isSelected
                      ? colors.brand.onPrimary
                      : colors.system.label.secondary,
                  },
                ]}
              >
                ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results count */}
      <View style={tw`px-4 pb-4`}>
        <Text variant="footnote" color="secondaryLabel">
          Showing {filteredCount} of {totalAlbums} albums
        </Text>
      </View>
    </View>
  )
);

RamadanYearHeader.displayName = "RamadanYearHeader";

export default function RamadanYearScreen() {
  const guardedPush = useGuardedPush();
  // useWindowDimensions, not a module-scope Dimensions.get(): the old
  // value was captured at import and never updated on rotation or resize.
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;
  const { colors } = useTheme();
  const { year } = useLocalSearchParams<{ year: string }>();
  const yearNum = parseInt(year || "0", 10);

  const [albums, setAlbums] = useState<RamadanAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [languages, setLanguages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

  const fetchAlbums = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const response = await ramadanApi.getRamadanAlbumsByYear(yearNum, pageNum);

        if (append) {
          setAlbums((prev) => [...prev, ...response.albums]);
        } else {
          setAlbums(response.albums);
          setTotalAlbums(response.total);
          setTotalLectures(response.lectures);
          setLanguages(response.languages);
        }

        setHasMore(response.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.error("Error fetching albums:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [yearNum]
  );

  useEffect(() => {
    if (yearNum > 0) {
      fetchAlbums(1, false);
    }
  }, [yearNum, fetchAlbums]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchAlbums(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchAlbums]);

  const handleAlbumPress = useCallback((album: RamadanAlbum) => {
    if (!album?.id) return;
    guardedPush(`/album/${album.id}`);
  }, [guardedPush]);

  // Filter albums by search and language
  const filteredAlbums = useMemo(() => {
    let result = albums;

    // Filter by language
    if (selectedLanguage !== "All") {
      result = result.filter(
        (album) => album.language.toLowerCase() === selectedLanguage.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((album) =>
        album.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [albums, selectedLanguage, searchQuery]);

  // Get language counts for filter chips
  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = { All: albums.length };
    albums.forEach((album) => {
      const lang = album.language;
      counts[lang] = (counts[lang] || 0) + 1;
    });
    return counts;
  }, [albums]);

  const renderAlbumCard = useCallback(
    ({ item }: { item: RamadanAlbum; index: number }) => {
      return (
        <View
          style={[{ width: CARD_WIDTH }, tw`mb-4`]}
        >
          <TouchableOpacity
            onPress={() => handleAlbumPress(item)}
            activeOpacity={0.8}
            style={[
              tw`rounded-2xl overflow-hidden`,
              {
                backgroundColor: colors.system.background.secondary,
              },
            ]}
          >
            <View style={tw`relative`}>
              <Image
                source={{ uri: item.alb_thumbnail || item.img }}
                style={tw`w-full aspect-square rounded-t-2xl`}
                resizeMode="cover"
              />
              {/* Lectures badge */}
              <View
                style={[
                  tw`absolute top-2 right-2 flex-row items-center px-2 py-1 rounded-full`,
                  { backgroundColor: colors.brand.primary },
                ]}
              >
                <Ionicons
                  name="headset"
                  size={10}
                  color={colors.brand.onPrimary}
                />
                <Text
                  variant="caption2"
                  weight="semibold"
                  style={[tw`ml-1`, { color: colors.brand.onPrimary }]}
                >
                  {item.lec_no}
                </Text>
              </View>
            </View>
            <View style={tw`p-3`}>
              <Text
                variant="subheadline"
                color="label"
                weight="semibold"
                numberOfLines={3}
                style={tw`leading-5`}
              >
                {item.name}
              </Text>
              <View style={tw`flex-row items-center mt-1`}>
                <View
                  style={[
                    tw`px-2 py-0.5 rounded`,
                    { backgroundColor: colors.system.fill.tertiary },
                  ]}
                >
                  <Text variant="caption2" color="secondaryLabel">
                    {item.language}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [colors, handleAlbumPress, CARD_WIDTH]
  );

  const listHeader = (
    <RamadanYearHeader
      colors={colors}
      yearNum={yearNum}
      totalAlbums={totalAlbums}
      totalLectures={totalLectures}
      languages={languages}
      searchQuery={searchQuery}
      selectedLanguage={selectedLanguage}
      languageCounts={languageCounts}
      filteredCount={filteredAlbums.length}
      onSearchChange={setSearchQuery}
      onSearchClear={() => setSearchQuery("")}
      onLanguageSelect={setSelectedLanguage}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={colors.brand.primary} />
        <Text variant="caption1" color="secondaryLabel" style={tw`mt-2`}>
          Loading more...
        </Text>
      </View>
    );
  };

  const header = <ScreenHeader title={`Ramadan ${yearNum}`} />;

  if (loading) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[
          tw`flex-1`,
          { backgroundColor: colors.system.background.primary },
        ]}
      >
        {header}
        <View style={tw`flex-1 items-center justify-center`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
              { backgroundColor: colors.brand.primary + "20" },
            ]}
          >
            <Ionicons name="moon" size={32} color={colors.brand.primary} />
          </View>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text variant="body" color="secondaryLabel" style={tw`mt-4`}>
            Loading Ramadan {yearNum} collection...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[
          tw`flex-1`,
          { backgroundColor: colors.system.background.primary },
        ]}
      >
        {header}
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Ionicons
            name="cloud-offline-outline"
            size={64}
            color={colors.system.label.tertiary}
          />
          <Text
            variant="title3"
            color="label"
            weight="semibold"
            style={tw`mt-4 text-center`}
          >
            Failed to load
          </Text>
          <Text
            variant="body"
            color="secondaryLabel"
            style={tw`mt-2 text-center`}
          >
            Please check your connection and try again
          </Text>
          <TouchableOpacity
            onPress={() => fetchAlbums(1, false)}
            style={[
              tw`mt-6 px-6 py-3 rounded-full`,
              { backgroundColor: colors.brand.primary },
            ]}
          >
            <Text
              variant="body"
              weight="semibold"
              style={{ color: colors.brand.onPrimary }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
      edges={["left", "right"]}
    >
      {header}

      {/* Albums Grid */}
      <FlatList
        data={filteredAlbums}
        renderItem={renderAlbumCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={listHeader}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={tw`px-4 pb-32`}
        columnWrapperStyle={tw`justify-between`}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListEmptyComponent={
          <View style={tw`flex-1 items-center justify-center py-20`}>
            <Ionicons
              name="search"
              size={64}
              color={colors.system.label.tertiary}
            />
            <Text
              variant="title3"
              color="secondaryLabel"
              style={tw`mt-4 text-center`}
            >
              No albums found
            </Text>
            <Text
              variant="body"
              color="tertiaryLabel"
              style={tw`mt-2 text-center px-8`}
            >
              Try adjusting your search or filter
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
