import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlashList } from "../../src/components/adapters/flashListCompat";
import { Card } from "../../src/components/molecules/Card";
import { useTheme } from "../../src/hooks/useTheme";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import { ApiError } from "../../src/services/api/base.api";
import { categoriesApi } from "../../src/services/api/categories.api";
import type { LecturerLecture } from "../../src/services/api/lecturers.api";
import { usePlayerActions } from "../../src/stores";
import tw from "../../src/theme/twrnc";
import type { Episode } from "../../src/types/types";
import { durationToSeconds } from "../../src/utils/quran";

/** Rows carry a page-scoped key: nid repeats across pages on some categories. */
type CategoryLecture = LecturerLecture & { _key: string };

const toEpisode = (lecture: LecturerLecture): Episode => ({
  id: String(lecture.nid),
  title: lecture.title || "Untitled Lecture",
  durationSec: durationToSeconds(lecture.duration),
  coverUrl: lecture.img || lecture.rp_image || "",
  audioUrl: lecture.audio || "",
  seriesId: "",
  plays: lecture.views || 0,
  liked: false,
  language: lecture.lang || "Unknown",
  downloads: lecture.downloads || 0,
  createdAt: new Date().toISOString(),
  lecturerName: lecture.rpname,
  rpname: lecture.rpname,
  isReciter: lecture.is_reciter ?? false,
});

export default function CategoryLecturesScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const categoryId = Array.isArray(id) ? id[0] : id;
  const categoryName = (Array.isArray(name) ? name[0] : name) || "Category";

  const { colors } = useTheme();
  const guardedPush = useGuardedPush();
  const { playEpisode } = usePlayerActions();

  const [lectures, setLectures] = useState<CategoryLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);
  // Distinguishes "this category is empty" from "the request never finished",
  // the same trap the lecturer screen fell into.
  const [hasSettled, setHasSettled] = useState(false);

  const fetchLectures = useCallback(
    async (nextPage = 1, append = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
        // Reset here rather than in the mount effect: a fetch that has been
        // started but not answered must not still look settled.
        setHasSettled(false);
      }

      try {
        const result = await categoriesApi.getCategoryLectures(
          categoryId,
          nextPage,
        );
        const keyed = result.data.map((lecture, index) => ({
          ...lecture,
          _key: `${nextPage}-${index}-${lecture.nid}`,
        }));

        setLectures((prev) => (append ? [...prev, ...keyed] : keyed));
        setHasMore(result.hasMore);
        setPage(nextPage);
        setHasSettled(true);
      } catch (err) {
        if (err instanceof ApiError && err.isCancelled) return;

        setHasMore(false);
        if (!append) {
          setError(
            err instanceof ApiError && (err.isTimeout || err.isNetworkError)
              ? err.message
              : "We couldn't load lectures for this category.",
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [categoryId],
  );

  useEffect(() => {
    void fetchLectures();
  }, [fetchLectures]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore || isLoadingRef.current) return;
    void fetchLectures(page + 1, true);
  }, [hasMore, loading, loadingMore, page, fetchLectures]);

  const renderItem = useCallback(
    ({ item }: { item: CategoryLecture }) => (
      <Card
        variant="section"
        data={toEpisode(item)}
        onPress={() => guardedPush(`/lecture/${item.nid}`)}
        onPlayPress={() => playEpisode(toEpisode(item))}
        showTime
        showMeta
        metaValue={item.rpname}
      />
    ),
    [guardedPush, playEpisode],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={colors.brand.primary} />
      </View>
    );
  }, [loadingMore, colors]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={tw`px-5 py-10 items-center`}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
          <Text style={[tw`mt-2`, { color: colors.system.label.secondary }]}>
            Loading lectures...
          </Text>
        </View>
      );
    }

    // No rows, no error and nothing ever came back: an interrupted request,
    // not an empty category. Offer the retry rather than asserting emptiness.
    const message =
      error ?? (hasSettled ? null : "We couldn't finish loading this category.");

    if (message) {
      return (
        <View style={tw`px-5 py-10 items-center`}>
          <Text
            style={[
              tw`text-center mb-4`,
              { color: colors.system.label.secondary },
            ]}
          >
            {message}
          </Text>
          <TouchableOpacity
            onPress={() => void fetchLectures()}
            accessibilityRole="button"
            style={[
              tw`px-6 py-3 rounded-lg`,
              { backgroundColor: colors.system.fill.tertiary },
            ]}
          >
            <Text style={{ color: colors.system.label.primary }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={tw`px-5 py-10 items-center`}>
        <Text
          style={[tw`text-center`, { color: colors.system.label.secondary }]}
        >
          No lectures in this category yet
        </Text>
      </View>
    );
  }, [loading, error, hasSettled, colors, fetchLectures]);

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
            tw`text-lg font-bold flex-1 text-center px-2`,
            { color: colors.system.label.primary },
          ]}
          numberOfLines={2}
        >
          {categoryName}
        </Text>

        <View style={tw`w-10`} />
      </View>

      <FlashList
        data={lectures}
        renderItem={renderItem}
        keyExtractor={(item: CategoryLecture) => item._key}
        contentContainerStyle={tw`px-4 pb-20`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </SafeAreaView>
  );
}
