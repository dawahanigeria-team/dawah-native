import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { ActionGrid } from "../../src/components/organisms/ActionGrid";
import { HeroCarousel } from "../../src/components/organisms/HeroCarousel";
import { Row } from "../../src/components/organisms/Row";
import { usePlayerStore } from "../../src/stores";
import { usePopularLectures } from "../../src/hooks/usePopularLectures";
import { useLecturers } from "../../src/hooks/useLecturers";
import { LecturerCard } from "../../src/components/molecules/LecturerCard";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, Series } from "../../src/types/types";
import { getRandomScholar } from "../../src/utils/scholarNames";

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
    language: "English",
    downloads: 250,
    createdAt: "2024-03-15T10:00:00Z",
    lecturerName: "Sheikh Muhammad Ali",
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
    lecturerName: "Dr. Bilal Philips",
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
    language: "Hausa",
    downloads: 120,
    createdAt: "2024-03-05T09:15:00Z",
    lecturerName: "Sheikh Abubakar Gumi",
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
    lecturerName: "Ustadh Abdullah Hakim",
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
    language: "English",
    downloads: 95,
    createdAt: "2024-02-20T11:20:00Z",
    lecturerName: "Sheikh Ibrahim Zakzaky",
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
  const playerStore = usePlayerStore();
  const { playEpisode } = playerStore;

  // Fetch popular lectures for the carousel
  const { episodes: popularEpisodes, loading: popularLoading, error: popularError } = usePopularLectures(10);

  // Fetch lecturers for the slider - limit to 12 for better horizontal scrolling UX
  const { lecturerCards, loading: lecturersLoading, error: lecturersError } = useLecturers(12);

  const handleQuickActionPress = useCallback((item: { id: string; title: string }) => {
    if (item.title === "Lecturers") {
      router.push("/lecturers");
      return;
    }

    console.log("Unhandled quick action press:", item);
  }, []);

  const handleEpisodePress = async (episode: Episode) => {
    console.log('🎵 Play button pressed for:', episode.title);
    console.log('🔗 Audio URL:', episode.audioUrl);

    try {
      await playEpisode(episode);
      console.log('✅ Episode playing successfully');
    } catch (error) {
      console.error('❌ Error playing episode:', error);
    }
  };

  const handleLecturerPress = (lecturerId: string) => {
    console.log('Lecturer pressed with ID:', lecturerId);
    // Navigate to lecturer detail page
    router.push(`/lecturer/${lecturerId}`);
  };

  const handleSearchSubmit = (query: string) => {
    // Navigate to search page when user submits
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/search");
    }
  };

  const handleMicPress = () => {
    // Navigate to search page for voice search
    router.push("/search?voice=true");
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

      {/* Search Bar - Real functional search */}
      <View style={tw`px-4 mb-4`}>
        <SearchBar
          placeholder="Search lectures, scholars..."
          onSearch={handleSearchSubmit}
          onMicPress={handleMicPress}
          disabled={false}
        />
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-20`}
        accessibilityLabel="Home content"
      >
        {/* Hero Carousel - Popular Lectures */}
        {popularLoading ? (
          <View style={tw`h-56 items-center justify-center`}>
            <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
            <Text style={tw`text-white mt-2`}>Loading popular lectures...</Text>
          </View>
        ) : popularError ? (
          <View style={tw`h-56 items-center justify-center px-6`}>
            <Text style={tw`text-white text-center`}>Failed to load popular lectures</Text>
            <Text style={tw`text-gray-400 text-sm text-center mt-1`}>Using offline content</Text>
            <HeroCarousel
              items={mockEpisodes.slice(0, 5)}
              onItemPress={handleEpisodePress}
              onPlayPress={handleEpisodePress}
            />
          </View>
        ) : popularEpisodes.length > 0 ? (
          <HeroCarousel
            items={popularEpisodes}
            onItemPress={handleEpisodePress}
            onPlayPress={handleEpisodePress}
          />
        ) : (
          // Fallback to mock data if no popular lectures
          <HeroCarousel
            items={mockEpisodes.slice(0, 5)}
            onItemPress={handleEpisodePress}
            onPlayPress={handleEpisodePress}
          />
        )}

        {/* Action Grid */}
        <ActionGrid onItemPress={handleQuickActionPress} />

        {/* Lecturers/Scholars Slider */}
        <Row
          title="Popular Scholars"
          subtitle="Learn from renowned Islamic scholars"
          onSeeAll={() => router.push("/lecturers")}
        >
          {lecturersLoading ? (
            <View style={tw`h-32 items-center justify-center`}>
              <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
              <Text style={tw`text-gray-400 text-xs mt-2`}>Loading scholars...</Text>
            </View>
          ) : lecturersError ? (
            <View style={tw`h-32 items-center justify-center px-4`}>
              <Text style={tw`text-gray-400 text-sm text-center`}>Unable to load scholars</Text>
            </View>
          ) : lecturerCards.length > 0 ? (
            lecturerCards.map((lecturer, index) => (
              <LecturerCard
                key={lecturer.id}
                id={lecturer.id}
                name={lecturer.name}
                imageUrl={lecturer.imageUrl}
                totalLectures={lecturer.totalLectures}
                followers={lecturer.followers}
                language={lecturer.language}
                verified={lecturer.verified}
                onPress={() => handleLecturerPress(lecturer.id)}
              />
            ))
          ) : (
            <View style={tw`h-32 items-center justify-center px-4`}>
              <Text style={tw`text-gray-400 text-sm text-center`}>No scholars available</Text>
            </View>
          )}
        </Row>

        {/* Recently Played */}
        <Row
          title="Recently Played"
          subtitle="Continue where you left off"
          onSeeAll={() => router.push("/section/recently-played")}
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
                metaValue={getRandomScholar(`recently-played-${episode.id}`)}
              />
            </View>
          ))}
        </Row>

        {/* Recently Posted */}
        <Row
          title="Recently Posted"
          subtitle="Latest content from our scholars"
          onSeeAll={() => router.push("/section/recently-posted")}
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
                metaValue={getRandomScholar(`recently-posted-${episode.id}`)}
              />
            </View>
          ))}
        </Row>

        {/* Featured Lectures */}
        <Row
          title="Featured Lectures"
          subtitle="Handpicked content for you"
          onSeeAll={() => router.push("/section/featured-lectures")}
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
                metaValue={getRandomScholar(`featured-${episode.id}`)}
              />
            </View>
          ))}
        </Row>

        {/* Trending Series */}
        <Row title="Trending" onSeeAll={() => router.push("/section/trending")}>
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
          onSeeAll={() => router.push("/section/quran-recitations")}
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
