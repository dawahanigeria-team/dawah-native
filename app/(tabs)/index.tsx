import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { ActionGrid } from "../../src/components/organisms/ActionGrid";
import { HeroCarousel } from "../../src/components/organisms/HeroCarousel";
import { Row } from "../../src/components/organisms/Row";
import { usePlayerStore } from "../../src/stores/playerStore";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";

// Mock data - in a real app this would come from an API
const mockEpisodes: Episode[] = [
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

const mockSeries: Series[] = [
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
    coverUrl: "", // Empty to show placeholder
    language: "English",
    tags: ["Akhlaq", "Character", "Ethics"],
    lecturerId: "2",
  },
  {
    id: "3",
    title: "Women in Islam",
    coverUrl: "", // Empty to show placeholder
    language: "Yoruba",
    tags: ["Women", "Islamic Rights", "Empowerment"],
    lecturerId: "3",
  },
  {
    id: "4",
    title: "Islamic History & Civilization",
    coverUrl:
      "https://images.unsplash.com/photo-1447069388813-9e89e38406f7?w=300&h=300&fit=crop",
    language: "Hausa",
    tags: ["History", "Civilization", "Islamic Heritage"],
    lecturerId: "4",
  },
];

export default function HomeScreen() {
  const { playEpisode } = usePlayerStore();

  const handleEpisodePress = (episode: Episode) => {
    playEpisode(episode);
  };

  const handleSearch = (query: string) => {
    // In a real app, this would trigger a search
    console.log("Search query:", query);
  };

  const handleMicPress = () => {
    // In a real app, this would open voice search
    console.log("Voice search pressed");
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
          {/* Left side - Logo */}
          <View
            style={[
              tw`w-8 h-8 rounded-lg items-center justify-center`,
              { backgroundColor: designTokens.colors.brand.primary },
            ]}
            accessibilityLabel="Dawah Nigeria logo"
            accessibilityRole="image"
          >
            <Text
              style={[
                tw`font-bold text-lg`,
                { color: designTokens.colors.system.background.primary },
              ]}
            >
              DN
            </Text>
          </View>

          {/* Center - App Title */}
          <Text
            style={[
              tw`text-xl font-bold flex-1 text-center`,
              { color: designTokens.colors.system.label.primary },
            ]}
            accessibilityRole="header"
          >
            Dawah Nigeria
          </Text>

          {/* Right side - Notifications */}
          <View style={tw`w-8`}>
            <TouchableOpacity
              style={tw`items-center justify-center`}
              accessibilityLabel="Notifications"
              accessibilityHint="Tap to view notifications"
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={designTokens.colors.system.label.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={tw`px-4 mb-4`}>
        <SearchBar onSearch={handleSearch} onMicPress={handleMicPress} />
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-20`}
        accessibilityLabel="Home content"
      >
        {/* Hero Carousel */}
        <HeroCarousel
          items={mockEpisodes.slice(0, 5)}
          onItemPress={handleEpisodePress}
        />

        {/* Action Grid */}
        <ActionGrid />

        {/* Recently Played */}
        <Row
          title="Recently Played"
          subtitle="Continue where you left off"
          onSeeAll={() => console.log("See all recently played")}
        >
          {mockEpisodes.slice(0, 3).map((episode, index) => (
            <View
              key={episode.id}
              style={tw`${
                index < mockEpisodes.slice(0, 3).length - 1 ? "mr-4" : ""
              } w-80`}
            >
              <Card
                variant="landscape"
                data={episode}
                onPress={() => handleEpisodePress(episode)}
                showTime={true}
                showMeta={true}
                metaValue="Sheikh Ahmad Tijani"
              />
            </View>
          ))}
        </Row>

        {/* Recently Posted */}
        <Row
          title="Recently Posted"
          subtitle="Latest content from our scholars"
          onSeeAll={() => console.log("See all recently posted")}
        >
          {mockEpisodes.slice(0, 3).map((episode, index) => (
            <View
              key={`recent-${episode.id}`}
              style={tw`${
                index < mockEpisodes.slice(0, 3).length - 1 ? "mr-4" : ""
              } w-80`}
            >
              <Card
                variant="landscape"
                data={episode}
                onPress={() => handleEpisodePress(episode)}
                showTime={true}
                showMeta={true}
                metaValue="Sheikh Ahmad Tijani"
              />
            </View>
          ))}
        </Row>

        {/* Featured Lectures */}
        <Row
          title="Featured Lectures"
          subtitle="Handpicked content for you"
          onSeeAll={() => console.log("See all featured")}
        >
          {mockEpisodes.slice(0, 3).map((episode, index) => (
            <View
              key={`featured-${episode.id}`}
              style={tw`${
                index < mockEpisodes.slice(0, 3).length - 1 ? "mr-4" : ""
              } w-80`}
            >
              <Card
                variant="landscape"
                data={episode}
                onPress={() => handleEpisodePress(episode)}
                showTime={true}
                showMeta={true}
                metaValue="Sheikh Ahmad Tijani"
              />
            </View>
          ))}
        </Row>

        {/* Trending Series */}
        <Row title="Trending" onSeeAll={() => console.log("See all trending")}>
          {mockSeries
            .concat(mockSeries, mockSeries, mockSeries, mockSeries)
            .slice(0, 15)
            .map((series, index) => (
              <View
                key={`trending-${series.id}-${index}`}
                style={tw`${index < 14 ? "mr-4" : ""}`}
              >
                <View style={{ width: 140 }}>
                  <Card
                    variant="square"
                    data={series}
                    onPress={() => console.log("Series pressed:", series.title)}
                    showBadge={false}
                  />
                </View>
              </View>
            ))}
        </Row>

        {/* Quran Recitations */}
        <Row
          title="Quran Recitations"
          onSeeAll={() => console.log("See all Quran")}
        >
          {mockEpisodes
            .concat(mockEpisodes, mockEpisodes, mockEpisodes, mockEpisodes)
            .slice(0, 15)
            .map((episode, index) => (
              <View
                key={`quran-${episode.id}-${index}`}
                style={tw`${index < 14 ? "mr-4" : ""}`}
              >
                <View style={{ width: 140 }}>
                  <Card
                    variant="square"
                    data={episode}
                    onPress={() => handleEpisodePress(episode)}
                    showMeta={true}
                    metaValue="Sheikh Usman Dan Fodio"
                  />
                </View>
              </View>
            ))}
        </Row>
      </ScrollView>
    </SafeAreaView>
  );
}
