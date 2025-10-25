import { Ionicons } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { usePlayerStore, useDownloadsStore } from "../../src/stores";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";
import type { DownloadMetadata } from "../../src/services/downloads.service";

type LibraryTab = "Downloads" | "History" | "Liked" | "Playlists";

const mockDownloads: Episode[] = [
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
    downloads: 250,
    createdAt: "2024-03-15T10:00:00Z",
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
    downloads: 180,
    createdAt: "2024-03-10T14:30:00Z",
  },
];

const mockHistory: Episode[] = [
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
    language: "Hausa",
    downloads: 120,
    createdAt: "2024-03-05T09:15:00Z",
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
    language: "Yoruba",
    downloads: 160,
    createdAt: "2024-02-28T16:45:00Z",
  },
];

const mockLiked: Episode[] = [
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
    language: "English",
    downloads: 95,
    createdAt: "2024-02-20T11:20:00Z",
  },
];

const mockPlaylists: Series[] = [
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
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop",
    language: "English",
    tags: ["Akhlaq", "Character", "Ethics"],
    lecturerId: "2",
  },
];

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
  const [activeTab, setActiveTab] = useState<LibraryTab>("Downloads");

  const tabs: LibraryTab[] = ["Downloads", "History", "Liked", "Playlists"];

  // Refresh downloads when screen loads
  React.useEffect(() => {
    console.log('📚 Library: Refreshing downloads...');
    refreshDownloads().catch(err => {
      console.error('📚 Library: Failed to refresh downloads:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - only run once on mount

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
        return mockHistory;
      case "Liked":
        return mockLiked;
      case "Playlists":
        return mockPlaylists;
      default:
        return [];
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
            await deleteLecture(lectureId);
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

    if (data.length === 0) {
      return renderEmptyState(activeTab);
    }

    return (
      <View style={tw`px-4`}>
        {data.map((item) => (
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
