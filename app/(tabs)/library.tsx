import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { usePlayerStore } from "../../src/stores/playerStore";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";

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

export default function LibraryScreen() {
  const { playEpisode } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>("Downloads");

  const tabs: LibraryTab[] = ["Downloads", "History", "Liked", "Playlists"];

  const getTabData = () => {
    switch (activeTab) {
      case "Downloads":
        return mockDownloads;
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

  const renderEmptyState = (tab: LibraryTab) => (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <View
        style={[tw`w-16 h-16 rounded-full items-center justify-center mb-4`, { backgroundColor: '#2C2C2E' }]}
      >
        <Ionicons name={getTabIcon(tab)} size={32} color="rgba(235, 235, 245, 0.3)" />
      </View>
      <Text style={[tw`text-lg font-semibold mb-2`, { color: '#FFFFFF' }]}>
        No {tab.toLowerCase()} yet
      </Text>
      <Text style={[tw`text-center px-8`, { color: 'rgba(235, 235, 245, 0.6)' }]}>
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
              showTime={"durationSec" in item}
              showMeta={true}
              metaValue="Sheikh Ahmad Tijani"
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: '#000000' }]}>
      {/* Header */}
      <View style={tw`px-4 py-3`}>
        <Text style={[tw`text-2xl font-bold`, { color: '#FFFFFF' }]}>Library</Text>
      </View>

      {/* Segmented Control */}
      <View style={tw`px-4 mb-6`}>
        <View style={[tw`rounded-2xl p-1 flex-row`, { backgroundColor: '#2C2C2E' }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                tw`flex-1 py-2 px-1 rounded-xl items-center`,
                activeTab === tab && { backgroundColor: 'rgba(120, 120, 128, 0.2)' },
              ]}
              onPress={() => handleTabPress(tab)}
            >
              <Text
                style={[
                  tw`text-sm font-medium`,
                  { color: activeTab === tab ? '#FFFFFF' : 'rgba(235, 235, 245, 0.6)' },
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
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
