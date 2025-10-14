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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LecturerCard } from "../src/components/molecules/LecturerCard";
import { lecturersApi, Lecturer } from "../src/services/api/lecturers.api";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";

export default function LecturersScreen() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 20;

  const handleLecturerPress = useCallback((id: string) => {
    router.push(`/lecturer/${id}`);
  }, []);

  const fetchLecturers = async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await lecturersApi.getAllLecturers({
        page: pageNum,
        lim: itemsPerPage,
      });

      if (isRefresh) {
        setLecturers(response.data);
        setPage(1);
        setHasMore(response.data.length === itemsPerPage);
      } else if (pageNum === 1) {
        setLecturers(response.data);
        setHasMore(response.data.length === itemsPerPage);
      } else {
        setLecturers(prev => [...prev, ...response.data]);
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
  };

  useEffect(() => {
    fetchLecturers(1);
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLecturers(nextPage);
    }
  };

  const handleRefresh = () => {
    fetchLecturers(1, true);
  };

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
          verified={item.verified || (item.views && item.views > 1000)}
          onPress={() => handleLecturerPress(String(item.id))}
          style={tw`mr-0 w-full`}
        />
      </View>
    ),
    [handleLecturerPress]
  );

  const renderEmptyState = useCallback(() => (
    <View style={tw`py-20 items-center px-6`}>
      <Text
        style={[
          tw`text-base text-center`,
          { color: designTokens.colors.system.label.secondary },
        ]}
      >
        {error
          ? "We couldn't load the scholars right now."
          : "No scholars available at the moment."}
      </Text>

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
    </View>
  ), [error, handleRefresh]);

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
          data={lecturers}
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
