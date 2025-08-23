import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../components/molecules/Card";
import { usePlayer } from "../theme/PlayerContext";
import tw from "../theme/twrnc";
import { Episode, Series } from "../types/types";

type LibraryTab = "Downloads" | "History" | "Liked" | "Playlists";

const { width: screenWidth } = Dimensions.get("window");

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

export const LibraryScreen: React.FC = () => {
  const { playEpisode } = usePlayer();
  const [activeTab, setActiveTab] = useState<LibraryTab>("Downloads");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs: LibraryTab[] = ["Downloads", "History", "Liked", "Playlists"];

  // Debug function to check tab rendering
  const debugTabRendering = () => {
    console.log("Tab names:", tabs);
    console.log("Screen width:", screenWidth);
    console.log("Tab width:", screenWidth / tabs.length);
  };

  // Call debug function on mount
  React.useEffect(() => {
    debugTabRendering();
  }, []);

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

  const getTabCount = (tab: LibraryTab) => {
    switch (tab) {
      case "Downloads":
        return mockDownloads.length;
      case "History":
        return mockHistory.length;
      case "Liked":
        return mockLiked.length;
      case "Playlists":
        return mockPlaylists.length;
      default:
        return 0;
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
    <View style={tw`flex-1 items-center justify-center py-20 px-8`}>
      <View
        style={tw`w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-6`}
      >
        <Ionicons name={getTabIcon(tab)} size={36} color="#8B8CA1" />
      </View>
      <Text style={tw`text-white text-xl font-bold mb-3 text-center`}>
        No {tab.toLowerCase()} yet
      </Text>
      <Text style={tw`text-gray-400 text-center text-base leading-6`}>
        {tab === "Downloads" &&
          "Download episodes to listen offline and save data"}
        {tab === "History" &&
          "Your listening history will appear here as you explore content"}
        {tab === "Liked" &&
          "Like episodes to build your personal collection of favorites"}
        {tab === "Playlists" &&
          "Create and organize playlists to curate your learning journey"}
      </Text>

      {/* Action button for empty state */}
      <TouchableOpacity
        style={tw`mt-8 bg-green-500 px-6 py-3 rounded-full`}
        onPress={() => console.log(`Explore ${tab.toLowerCase()}`)}
      >
        <Text style={tw`text-black font-semibold text-base`}>
          Explore Content
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={tw`px-5 mb-6`}>
      <View style={tw`bg-gray-900 rounded-2xl flex-row items-center px-4 py-3`}>
        <Ionicons name="search" size={20} color="#8B8CA1" style={tw`mr-3`} />
        <TextInput
          style={tw`flex-1 text-white text-base`}
          placeholder="Search your library..."
          placeholderTextColor="#8B8CA1"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#8B8CA1" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    const data = getTabData();

    if (data.length === 0) {
      return renderEmptyState(activeTab);
    }

    return (
      <View style={tw`px-5`}>
        {/* Section header with count */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={tw`text-white text-lg font-semibold`}>
            {activeTab} ({data.length})
          </Text>
          {data.length > 0 && (
            <TouchableOpacity>
              <Text style={tw`text-green-500 text-sm font-medium`}>
                View All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content list */}
        {data.map((item, index) => (
          <View key={item.id} style={tw`mb-4`}>
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
    <SafeAreaView style={tw`flex-1 bg-black`}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Enhanced Header */}
      <View style={tw`px-5 py-6`}>
        <Text style={tw`text-white text-3xl font-bold mb-1`}>Library</Text>
        <Text style={tw`text-gray-400 text-base`}>
          Your personal collection of Islamic knowledge
        </Text>
      </View>

      {/* Search Bar */}
      {renderSearchBar()}

      {/* Enhanced Segmented Control */}
      <View style={tw`px-5 mb-8`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`flex-row`}
        >
          <View style={tw`bg-gray-900 rounded-3xl p-1.5 flex-row`}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              const count = getTabCount(tab);

              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    tw`py-3 px-2 rounded-2xl items-center justify-center mx-1 flex-1 min-w-24`,
                    isActive && tw`bg-green-500`,
                  ]}
                  onPress={() => handleTabPress(tab)}
                  activeOpacity={0.8}
                >
                  <View style={tw`items-center`}>
                    <Ionicons
                      name={getTabIcon(tab)}
                      size={16}
                      color={isActive ? "#000000" : "#8B8CA1"}
                      style={tw`mb-1`}
                    />
                    <Text
                      style={[
                        tw`text-xs font-semibold text-center leading-tight`,
                        isActive ? tw`text-black` : tw`text-gray-400`,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.8}
                    >
                      {tab}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          tw`mt-1 px-1 py-0.5 rounded-full`,
                          isActive
                            ? tw`bg-black bg-opacity-20`
                            : tw`bg-gray-700`,
                        ]}
                      >
                        <Text
                          style={[
                            tw`text-xs font-medium`,
                            isActive ? tw`text-black` : tw`text-gray-300`,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Enhanced Content */}
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-32`}
        bounces={true}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};
