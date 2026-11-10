import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { FlashList } from "../../src/components/adapters/flashListCompat";
import { Text, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { LectureRow } from "../../src/components/molecules/LectureRow";
import { episodeToRow } from "../../src/components/molecules/lectureRowModel";
import { ScreenHeader } from "../../src/components/molecules/ScreenHeader";
import { Button } from "../../src/components/atoms/Button";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import { usePlayerActions, useDownloadsStore, useFavoritesStore } from "../../src/stores";
import { useAuthStore } from "../../src/stores/authStore";
import { useTheme } from "../../src/hooks/useTheme";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";
import type { DownloadMetadata } from "../../src/services/downloads.service";
import { captureSentryException, addSentryBreadcrumb } from "../../src/services/config/sentry.config";
import { logger } from "../../src/utils/logger";
import { historyService } from "../../src/services/history.service";
import { lectureDetailApi } from "../../src/services/api/lectureDetail.api";
import { playlistApi } from "../../src/services/api/playlist.api";
import type { UserPlaylist } from "../../src/types/api.types";
import { resolveFavoriteIdsForLoad } from "../../src/features/library/resolveFavoriteIdsForLoad";
import { mapWithConcurrency } from "../../src/utils/mapWithConcurrency";
import { type DownloadGroupHeader, groupDownloads } from "../../src/features/library/groupDownloads";

type LibraryTab = "Downloads" | "History" | "Liked" | "Playlists";

// Helper to convert DownloadMetadata to Episode
const downloadToEpisode = (download: DownloadMetadata): Episode => ({
  id: download.lectureId,
  title: download.title,
  lecturerName: download.lecturerName,
  durationSec: download.duration,
  coverUrl: download.coverUrl || "",
  // Use stored audioUrl (player will load from local file via downloadsService)
  audioUrl: download.audioUrl || "offline",
  seriesId: "",
  plays: 0,
  liked: false,
  language: "",
  downloads: 0,
  createdAt: download.downloadedAt,
  seriesTitle: download.seriesTitle,
});

export default function LibraryScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <LibraryScreen />
    </ErrorBoundary>
  );
}

function LibraryScreen() {
  const guardedPush = useGuardedPush();
  const { playEpisode } = usePlayerActions();
  const { downloads, deleteLecture, getTotalStorageUsed, refreshDownloads } = useDownloadsStore();
  const { favoriteIds, fetchFavorites, loading: favoritesLoading } = useFavoritesStore();
  const { isAuthenticated } = useAuthStore();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<LibraryTab>("Downloads");
  const [historyEpisodes, setHistoryEpisodes] = useState<Episode[]>([]);
  const [likedEpisodes, setLikedEpisodes] = useState<Episode[]>([]);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const tabs: LibraryTab[] = ["Downloads", "History", "Liked", "Playlists"];

  // Refresh downloads when screen loads
  useEffect(() => {
    logger.debug('Library: Refreshing downloads...');
    refreshDownloads().catch(err => {
      console.error('📚 Library: Failed to refresh downloads:', err);
      captureSentryException(err, {
        component: 'LibraryScreen',
        action: 'refreshDownloads',
        level: 'warning',
      });
    });
  }, [refreshDownloads]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      logger.debug('Loading history...');
      const episodes = await historyService.getHistoryAsEpisodes();
      setHistoryEpisodes(episodes);
      logger.debug(`Loaded ${episodes.length} history items`);
    } catch (err) {
      console.error('Failed to load history:', err);
      captureSentryException(err as Error, {
        component: 'LibraryScreen',
        action: 'loadHistory',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadFavorites = async () => {
    try {
      setLoadingLiked(true);
      logger.debug('Loading favorites...');

      const favoriteIdsToLoad = await resolveFavoriteIdsForLoad(favoriteIds, fetchFavorites);

      // Four at a time: a serial loop made 20 likes cost ~20 round trips.
      const lectures = await mapWithConcurrency(favoriteIdsToLoad, 4, (lectureId) =>
        lectureDetailApi.getLectureDetail({ lectureId, countView: false }).catch((err) => {
          console.warn(`Failed to load lecture ${lectureId}:`, err);
          return undefined;
        }),
      );
      const episodes: Episode[] = lectures
        .filter((lecture): lecture is NonNullable<typeof lecture> => Boolean(lecture))
        .map((lecture) => ({
          id: lecture.id,
          title: lecture.title,
          lecturerName: lecture.lecturerName || 'Unknown',
          durationSec: lecture.durationSec || 0,
          coverUrl: lecture.coverUrl || '',
          audioUrl: lecture.audioUrl || '',
          seriesId: lecture.albumId || '',
          plays: lecture.views || 0,
          liked: true,
          language: lecture.language || '',
          downloads: lecture.downloads || 0,
          createdAt: lecture.postedDate || new Date().toISOString(),
        }));

      setLikedEpisodes(episodes);
      logger.debug(`Loaded ${episodes.length} liked lectures`);
    } catch (err) {
      console.error('Failed to load favorites:', err);
      captureSentryException(err as Error, {
        component: 'LibraryScreen',
        action: 'loadFavorites',
      });
    } finally {
      setLoadingLiked(false);
    }
  };

  const loadPlaylists = async () => {
    if (!isAuthenticated) {
      setPlaylists([]);
      setLoadingPlaylists(false);
      return;
    }

    try {
      setLoadingPlaylists(true);
      const response = await playlistApi.getUserPlaylists();
      if (response.success && response.playlists) {
        setPlaylists(response.playlists);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch playlists.');
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
      captureSentryException(err as Error, {
        component: 'LibraryScreen',
        action: 'loadPlaylists',
      });
      Alert.alert('Error', 'Failed to load playlists. Please try again.');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Declared above the effects that call them: as `const`, a reference from
  // an effect placed earlier binds before initialization, so the effect cannot
  // see a later definition. The dependency arrays stay keyed on the active tab
  // because these are re-created every render and depending on them would
  // refetch on every render.
  // Load history when History tab is active
  useEffect(() => {
    if (activeTab === 'History') {
      loadHistory();
    }
  }, [activeTab]);

  // Load favorites when Liked tab is active
  useEffect(() => {
    if (activeTab === 'Liked') {
      loadFavorites();
    }
  }, [activeTab]);

  // Load playlists when Playlists tab is active
  useEffect(() => {
    if (activeTab === 'Playlists') {
      loadPlaylists();
    }
  }, [activeTab, isAuthenticated]);

  // Convert downloads to Episodes
  const downloadedEpisodes = useMemo(() => {
    logger.debug('Library: Total downloads:', downloads.length);
    downloads.forEach((d, i) => {
      logger.debug(`  ${i + 1}. ${d.title} (${d.lectureId})`);
    });
    return downloads.map(downloadToEpisode);
  }, [downloads]);

  const playlistSeries = useMemo<Series[]>(() => {
    return playlists.map((playlist) => ({
      id: playlist.id,
      title: playlist.name,
      coverUrl: "",
      language: "",
      tags: [],
      lecturerId: "",
    }));
  }, [playlists]);

  const playlistCounts = useMemo(() => {
    return new Map(playlists.map((playlist) => [playlist.id, playlist.count]));
  }, [playlists]);

  const getTabData = () => {
    switch (activeTab) {
      case "Downloads":
        return groupDownloads(downloadedEpisodes);
      case "History":
        return historyEpisodes;
      case "Liked":
        return likedEpisodes;
      case "Playlists":
        return playlistSeries;
      default:
        return [];
    }
  };

  const isTabLoading = () => {
    switch (activeTab) {
      case "History":
        return loadingHistory;
      case "Liked":
        return loadingLiked || favoritesLoading;
      case "Playlists":
        return loadingPlaylists;
      default:
        return false;
    }
  };

  const getTabIcon = (tab: LibraryTab) => {
    switch (tab) {
      case "Downloads":
        return "download-outline";
      case "History":
        return "time-outline";
      case "Liked":
        return "heart-outline";
      case "Playlists":
        return "list-outline";
      default:
        return "document-outline";
    }
  };

  const handleTabPress = (tab: LibraryTab) => {
    setActiveTab(tab);
  };

  const handleItemPress = (item: Episode | Series) => {
    if ("durationSec" in item) {
      // It's an episode
      playEpisode(item);
    } else {
      // It's a series/playlist
      if (activeTab === "Playlists") {
        guardedPush(`/playlist/${item.id}` as any);
      } else {
        logger.debug("Series/Playlist pressed:", item.title);
      }
    }
  };

  const handleDeleteDownload = (lectureId: string, title: string) => {
    Alert.alert(
      "Delete Download",
      `Remove "${title}" from downloads?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              addSentryBreadcrumb('Deleting download', 'user', {
                lectureId,
                title,
              });
              await deleteLecture(lectureId);
            } catch (err: any) {
              console.error('Failed to delete download:', err);
              captureSentryException(err, {
                component: 'LibraryScreen',
                action: 'handleDeleteDownload',
                lectureId,
                title,
                level: 'error',
              });
              Alert.alert(
                'Delete Failed',
                'Unable to delete download. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = (tab: LibraryTab) => (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <View
        style={[
          tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
          { backgroundColor: colors.system.background.tertiary },
        ]}
      >
        <Ionicons
          name={getTabIcon(tab)}
          size={32}
          color={colors.system.label.tertiary}
          accessibilityLabel={`${tab} icon`}
        />
      </View>
      <Text
        style={[
          tw`text-lg font-semibold mb-2`,
          { color: colors.system.label.primary },
        ]}
        accessibilityRole="header"
      >
        No {tab.toLowerCase()} yet
      </Text>
      <Text
        style={[
          tw`text-center px-8`,
          { color: colors.system.label.secondary },
        ]}
        accessibilityRole="text"
      >
        {tab === "Downloads" && "Download episodes to listen offline"}
        {tab === "History" && "Your listening history will appear here"}
        {tab === "Liked" && "Like episodes to see them here"}
        {tab === "Playlists" &&
          (isAuthenticated
            ? "Create playlists to organize your content"
            : "Sign in to create playlists and keep your lectures organized")}
      </Text>
      {tab === "Playlists" && !isAuthenticated && (
        <View style={tw`mt-5`}>
          <Button
            size="medium"
            onPress={() => guardedPush({ pathname: "/sign-in", params: { returnTo: "/library" } })}
          >
            Sign in to create playlists
          </Button>
        </View>
      )}
    </View>
  );

  const data = getTabData();
  const loading = isTabLoading();

  const renderListItem = useCallback(({ item }: { item: Episode | Series | DownloadGroupHeader }) =>
    "kind" in item ? (
      <View style={tw`flex-row items-center justify-between px-4 pt-5 pb-1`}>
        <Text
          style={[tw`text-lg font-semibold flex-1 mr-3`, { color: colors.system.label.primary }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {item.title}
        </Text>
        <Text style={[tw`text-sm`, { color: colors.system.label.secondary }]}>
          {item.count} {item.count === 1 ? "lecture" : "lectures"}
        </Text>
      </View>
    ) : "durationSec" in item ? (
      <LectureRow
        lecture={episodeToRow(item)}
        onPress={() => handleItemPress(item)}
        onMore={
          activeTab === "Downloads"
            ? () => handleDeleteDownload(item.id, item.title)
            : undefined
        }
        onLongPress={
          activeTab === "Downloads"
            ? () => handleDeleteDownload(item.id, item.title)
            : undefined
        }
      />
    ) : (
      <View style={tw`mb-3 px-4`}>
        <Card
          variant="landscape"
          data={item}
          onPress={() => handleItemPress(item)}
          showTime={false}
          showMeta={true}
          metaValue={`${playlistCounts.get(item.id) ?? 0} tracks`}
        />
      </View>
    ), [activeTab, handleItemPress, handleDeleteDownload, playlistCounts, colors]);

  const renderListEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={tw`flex-1 items-center justify-center py-20`}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />
          <Text
            style={[
              tw`mt-4`,
              { color: colors.system.label.secondary },
            ]}
          >
            Loading {activeTab.toLowerCase()}...
          </Text>
        </View>
      );
    }

    return renderEmptyState(activeTab);
  }, [activeTab, loading, colors, isAuthenticated]);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader
        variant="large"
        title="Library"
        subtitle={
          activeTab === "Downloads" && downloadedEpisodes.length > 0
            ? `${getTotalStorageUsed()} used`
            : undefined
        }
      />

      {/* Segmented Control */}
      <View style={tw`px-4 mb-6`}>
        <View
          style={[
            tw`rounded-2xl p-1 flex-row`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                tw`flex-1 py-2 px-1 rounded-xl items-center`,
                activeTab === tab && {
                  backgroundColor: colors.system.fill.primary,
                },
              ]}
              onPress={() => handleTabPress(tab)}
              accessibilityRole="tab"
              accessibilityLabel={`${tab} tab`}
              accessibilityHint={`Tap to view ${tab.toLowerCase()} content`}
              accessibilityState={{ selected: activeTab === tab }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  tw`text-sm font-medium`,
                  {
                    color:
                      activeTab === tab
                        ? colors.system.label.primary
                        : colors.system.label.secondary,
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <FlashList
        data={loading ? [] : data}
        renderItem={renderListItem}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-40`}
        ListEmptyComponent={renderListEmpty}
        accessibilityLabel="Library content"
      />
    </SafeAreaView>
  );
}
