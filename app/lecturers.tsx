import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LecturerCard } from "../src/components/molecules/LecturerCard";
import { lecturersApi, Lecturer } from "../src/services/api/lecturers.api";
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
  const itemsPerPage = 20;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'popular' | 'lectures'>('popular');

  const languages = ['All', 'English', 'Arabic', 'Hausa', 'Yoruba', 'Igbo', 'Fulani', 'French', 'Swahili'];

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

      console.log(`📚 Fetching lecturers - Page: ${pageNum}, Limit: ${itemsPerPage}`);

      const response = await lecturersApi.getAllLecturers({
        page: pageNum,
        lim: itemsPerPage,
      });

      console.log(`✅ Received ${response.data.length} lecturers for page ${pageNum}`);

      if (isRefresh) {
        setLecturers(response.data);
        setPage(1);
        setHasMore(response.data.length === itemsPerPage);
      } else if (pageNum === 1) {
        setLecturers(response.data);
        setHasMore(response.data.length === itemsPerPage);
      } else {
        setLecturers(prev => {
          const newTotal = prev.length + response.data.length;
          console.log(`📊 Total lecturers now: ${newTotal}`);
          return [...prev, ...response.data];
        });
        setHasMore(response.data.length === itemsPerPage);
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

  useEffect(() => {
    fetchLecturers(1);
  }, [fetchLecturers]);

  // Apply search, filter, and sort
  useEffect(() => {
    let result = [...lecturers];

    // Apply search
    if (searchQuery.trim()) {
      result = result.filter(lecturer =>
        lecturer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply language filter
    if (selectedLanguage && selectedLanguage !== 'All') {
      result = result.filter(lecturer =>
        lecturer.language === selectedLanguage
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
  }, [lecturers, searchQuery, selectedLanguage, sortBy]);

  const handleLoadMore = () => {
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
    const hasActiveFilters = searchQuery.trim() || selectedLanguage;

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
              setSelectedLanguage(null);
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
  }, [error, handleRefresh, searchQuery, selectedLanguage]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={tw`py-4`}>
        <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
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

      {/* Language Filter Chips */}
      <View style={tw`pb-3`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-5`}
        >
          {languages.map((lang) => {
            const isSelected = selectedLanguage === lang || (lang === 'All' && !selectedLanguage);
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => setSelectedLanguage(lang === 'All' ? null : lang)}
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
                  {lang}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort and Filter Controls */}
      <View style={tw`flex-row items-center justify-between px-5 pb-3`}>
        <Text
          style={[
            tw`text-sm`,
            { color: designTokens.colors.system.label.secondary },
          ]}
        >
          {filteredLecturers.length} scholar{filteredLecturers.length !== 1 ? 's' : ''}
        </Text>

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

      {loading && lecturers.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator
            size="large"
            color={designTokens.colors.brand.primary}
          />
          <Text
            style={[
              tw`mt-3`,
              { color: designTokens.colors.system.label.secondary },
            ]}
          >
            Loading scholars...
          </Text>
        </View>
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
          showsVerticalScrollIndicator={false}
          accessibilityLabel="List of scholars"
        />
      )}
    </SafeAreaView>
  );
}
