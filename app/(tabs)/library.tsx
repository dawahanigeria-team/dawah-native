import { Ionicons } from "@expo/vector-icons";
import React, { useState, useMemo, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { usePlayerStore, useDownloadsStore, useFavoritesStore } from "../../src/stores";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";
import type { DownloadMetadata } from "../../src/services/downloads.service";
import { captureSentryException, addSentryBreadcrumb } from "../../src/services/config/sentry.config";
import { historyService } from "../../src/services/history.service";
import { lectureDetailApi } from "../../src/services/api/lectureDetail.api";

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
});

export default function LibraryScreen() {
  const { playEpisode } = usePlayerStore();
  const { downloads, deleteLecture, getTotalStorageUsed, refreshDownloads } = useDownloadsStore();
  const { favoriteIds, fetchFavorites, loading: favoritesLoading } = useFavoritesStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>("Downloads");
  const [historyEpisodes, setHistoryEpisodes] = useState<Episode[]>([]);
  const [likedEpisodes, setLikedEpisodes] = useState<Episode[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);

  const tabs: LibraryTab[] = ["Downloads", "History", "Liked", "Playlists"];

  // Refresh downloads when screen loads
  useEffect(() => {
    console.log('📚 Library: Refreshing downloads...');
    refreshDownloads().catch(err => {
      console.error('📚 Library: Failed to refresh downloads:', err);
      captureSentryException(err, {
        component: 'LibraryScreen',
        action: 'refreshDownloads',
        level: 'warning',
      });
    });
  }, [refreshDownloads]);

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

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      console.log('📚 Loading history...');
      const episodes = await historyService.getHistoryAsEpisodes();
      setHistoryEpisodes(episodes);
      console.log(`✅ Loaded ${episodes.length} history items`);
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
      console.log('📚 Loading favorites...');

      // Fetch favorite IDs if not loaded
      if (favoriteIds.length === 0) {
        await fetchFavorites();
      }

      // Fetch lecture details for each favorite ID
      const episodes: Episode[] = [];
      for (const lectureId of favoriteIds) {
        try {
          const lecture = await lectureDetailApi.getLectureDetail({ lectureId });
          if (lecture) {
            episodes.push({
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
            });
          }
        } catch (err) {
          console.warn(`Failed to load lecture ${lectureId}:`, err);
        }
      }

      setLikedEpisodes(episodes);
      console.log(`✅ Loaded ${episodes.length} liked lectures`);
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

  // Convert downloads to Episodes
  const downloadedEpisodes = useMemo(() => {
    console.log('📚 Library: Total downloads:', downloads.length);
    downloads.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.title} (${d.lectureId})`);
    });
    return downloads.map(downloadToEpisode);
  }, [downloads]);

  const getTabData = () => {
    switch (activeTab) {
      case "Downloads":
        return downloadedEpisodes;
      case "History":
        return historyEpisodes;
      case "Liked":
        return likedEpisodes;
      case "Playlists":
        // TODO: Implement playlists
        return [];
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
      console.log("Series/Playlist pressed:", item.title);
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
          { backgroundColor: designTokens.colors.system.background.tertiary },
        ]}
      >
        <Ionicons
          name={getTabIcon(tab)}
          size={32}
          color={designTokens.colors.system.label.tertiary}
          accessibilityLabel={`${tab} icon`}
        />
      </View>
      <Text
        style={[
          tw`text-lg font-semibold mb-2`,
          { color: designTokens.colors.system.label.primary },
        ]}
        accessibilityRole="header"
      >
        No {tab.toLowerCase()} yet
      </Text>
      <Text
        style={[
          tw`text-center px-8`,
          { color: designTokens.colors.system.label.secondary },
        ]}
        accessibilityRole="text"
      >
        {tab === "Downloads" && "Download episodes to listen offline"}
        {tab === "History" && "Your listening history will appear here"}
        {tab === "Liked" && "Like episodes to see them here"}
        {tab === "Playlists" && "Create playlists to organize your content"}
      </Text>
    </View>
  );

  const renderContent = () => {
    const data = getTabData();
    const loading = isTabLoading();

    if (loading) {
      return (
        <View style={tw`flex-1 items-center justify-center py-20`}>
          <ActivityIndicator
            size="large"
            color={designTokens.colors.brand.primary}
          />
          <Text
            style={[
              tw`mt-4`,
              { color: designTokens.colors.system.label.secondary },
            ]}
          >
            Loading {activeTab.toLowerCase()}...
          </Text>
        </View>
      );
    }

    if (data.length === 0) {
      return renderEmptyState(activeTab);
    }

    return (
      <View style={tw`px-4`}>
        {data.map((item: Episode | Series) => (
          <View key={item.id} style={tw`mb-3`}>
            <Card
              variant="landscape"
              data={item}
              onPress={() => handleItemPress(item)}
              onLongPress={
                activeTab === "Downloads" && "durationSec" in item
                  ? () => handleDeleteDownload(item.id, item.title)
                  : undefined
              }
              showTime={"durationSec" in item}
              showMeta={true}
              metaValue={
                "lecturerName" in item
                  ? item.lecturerName || "Unknown"
                  : "Sheikh Nasir Kabara"
              }
            />
          </View>
        ))}
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
      {/* Header */}
      <View style={tw`px-4 py-3`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text
            style={[
              tw`text-2xl font-bold`,
              { color: designTokens.colors.system.label.primary },
            ]}
            accessibilityRole="header"
          >
            Library
          </Text>
          {activeTab === "Downloads" && downloadedEpisodes.length > 0 && (
            <View style={tw`flex-row items-center`}>
              <Ionicons
                name="cloud-outline"
                size={16}
                color={designTokens.colors.system.label.secondary}
              />
              <Text
                style={[
                  tw`text-sm ml-1`,
                  { color: designTokens.colors.system.label.secondary },
                ]}
              >
                {getTotalStorageUsed()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Segmented Control */}
      <View style={tw`px-4 mb-6`}>
        <View
          style={[
            tw`rounded-2xl p-1 flex-row`,
            { backgroundColor: designTokens.colors.system.background.tertiary },
          ]}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                tw`flex-1 py-2 px-1 rounded-xl items-center`,
                activeTab === tab && {
                  backgroundColor: designTokens.colors.system.fill.primary,
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
                        ? designTokens.colors.system.label.primary
                        : designTokens.colors.system.label.secondary,
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
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-24`}
        accessibilityLabel="Library content"
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
