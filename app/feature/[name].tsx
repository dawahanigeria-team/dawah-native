import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEntity } from "simpler-state";

import { FlashList } from "../../src/components/adapters/flashListCompat";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import {
  episodeToRow,
  LectureRow,
  ScreenHeader,
} from "../../src/components/molecules";
import { useSpecialFeatures } from "../../src/hooks/useSpecialFeatures";
import { useTheme } from "../../src/hooks/useTheme";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import { playerStore, usePlayerActions } from "../../src/stores";
import tw from "../../src/theme/twrnc";
import type { Episode } from "../../src/types/types";

export default function SpecialFeatureScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <SpecialFeatureScreen />
    </ErrorBoundary>
  );
}

function SpecialFeatureScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const groupName = (Array.isArray(name) ? name[0] : name) ?? "";

  const { colors } = useTheme();
  const guardedPush = useGuardedPush();
  const { playQueue, togglePlayPause } = usePlayerActions();
  const currentEpisodeId = useEntity(playerStore, (state) => state.currentEpisode?.id);
  const isPlaying = useEntity(playerStore, (state) => state.isPlaying);
  const { groups, loading, failed, reload } = useSpecialFeatures();

  const episodes = useMemo(
    () =>
      groups
        .find((group) => group.name === groupName)
        ?.lectures.map((lecture) => lecture.episode) ?? [],
    [groups, groupName],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Episode; index: number }) => (
      <LectureRow
        lecture={episodeToRow(item)}
        playback={item.id === currentEpisodeId ? (isPlaying ? "playing" : "paused") : "idle"}
        onPress={() => guardedPush(`/lecture/${item.id}`)}
        onPlay={() =>
          void (item.id === currentEpisodeId ? togglePlayPause() : playQueue(episodes, index))
        }
      />
    ),
    [currentEpisodeId, episodes, guardedPush, isPlaying, playQueue, togglePlayPause],
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={tw`py-10 items-center`}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
        </View>
      );
    }
    return (
      <View style={tw`px-5 py-10 items-center`}>
        <Text style={[tw`text-center mb-4`, { color: colors.system.label.secondary }]}>
          {failed
            ? "We couldn't load these lectures."
            : "This collection is no longer available."}
        </Text>
        {failed && (
          <TouchableOpacity
            onPress={() => void reload()}
            accessibilityRole="button"
            style={[tw`px-6 py-3 rounded-lg`, { backgroundColor: colors.system.fill.tertiary }]}
          >
            <Text style={{ color: colors.system.label.primary }}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors, failed, loading, reload]);

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[tw`flex-1`, { backgroundColor: colors.system.background.primary }]}
    >
      <ScreenHeader title={groupName || "Featured"} />
      <FlashList
        data={episodes}
        renderItem={renderItem}
        keyExtractor={(item: Episode, index: number) => `${item.id}-${index}`}
        contentContainerStyle={tw`pb-40`}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}
