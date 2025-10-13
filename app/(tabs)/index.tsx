 import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/molecules/Card";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { ActionGrid } from "../../src/components/organisms";
import { HeroCarousel } from "../../src/components/organisms/HeroCarousel";
import { Row } from "../../src/components/organisms/Row";
import { getSliderImages, getRecentLectures, getFeaturedLectures, getRecentPlays, getTrendingLectures } from "../../src/services";
import { usePlayerStore } from "../../src/stores/playerStore";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode, SliderImage, RecentPlay, Series } from "../../src/types/types";
import { getRandomScholar } from "../../src/utils/scholarNames";

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

export default function HomeScreen() {
  const { playEpisode } = usePlayerStore();
  const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);
  const [recentLectures, setRecentLectures] = useState<Episode[]>([]);
  const [featuredLectures, setFeaturedLectures] = useState<Series[]>([]);
  const [trendingLectures, setTrendingLectures] = useState<Episode[]>([]);
  const [recentPlays, setRecentPlays] = useState<RecentPlay[]>([]);

  useEffect(() => {
    const fetchSliderImages = async () => {
      try {
        const images = await getSliderImages();
        setSliderImages(images);
      } catch (error) {
        console.error('Failed to fetch slider images:', error);
        // Keep empty array on error
      }
    };

    const fetchRecentLectures = async () => {
      try {
        const lectures = await getRecentLectures(1);
        setRecentLectures(lectures);
      } catch (error) {
        console.error('Failed to fetch recent lectures:', error);
        // Keep empty array on error
      }
    };

    const fetchFeaturedLectures = async () => {
      try {
        const lectures = await getFeaturedLectures(1);
        setFeaturedLectures(lectures);
      } catch (error) {
        console.error('Failed to fetch featured lectures:', error);
        // Keep empty array on error
      }
    };

    const fetchTrendingLectures = async () => {
      try {
        const lectures = await getTrendingLectures(6, 1);
        setTrendingLectures(lectures);
      } catch (error) {
        console.error('Failed to fetch trending lectures:', error);
        // Keep empty array on error
      }
    };

    const fetchRecentPlays = async () => {
      try {
        const plays = await getRecentPlays('1'); // Placeholder user ID
        setRecentPlays(plays);
      } catch (error) {
        console.error('Failed to fetch recent plays:', error);
        // Keep empty array on error
      }
    };

    fetchSliderImages();
    fetchRecentLectures();
    fetchFeaturedLectures();
    fetchTrendingLectures();
    fetchRecentPlays();
  }, []);

  const handleEpisodePress = (item: Episode | SliderImage) => {
    const episode = item as Episode;
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

  const handleSliderPress = (item: SliderImage | Episode) => {
    // Handle slider item press - navigate to featured content or open link
    if ('imageUrl' in item) {
      const slider = item as SliderImage;
      if (slider.link) {
        // Open link if available
        console.log('Open link:', slider.link);
      } else {
        // Navigate to featured section
        router.push('/section/featured');
      }
    }
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
          <View style={tw`flex-row items-center`}>
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
        {/* Slider Carousel */}
        {sliderImages.length > 0 && (
          <HeroCarousel
            items={sliderImages}
            type="slider"
            height={200}
            autoplay={true}
            autoplayInterval={4000}
            onItemPress={handleSliderPress}
          />
        )}

        {/* Action Grid */}
        <ActionGrid />

        {/* Recently Played */}
        <Row
          title="Recently Played"
          subtitle="Continue where you left off"
          onSeeAll={() => router.push("/section/recently-played")}
        >
          {(recentPlays.length > 0 ? recentPlays.map(play => play.episode) : mockEpisodes).slice(0, 3).map((episode, index) => (
            <View
              key={`recent-play-${episode.id}`}
              style={[tw`w-80`, index < 2 && tw`mr-4`]}
            >
              <Card
                variant="landscape"
                data={episode}
                onPress={() => handleEpisodePress(episode)}
                showTime={true}
                showMeta={true}
                metaValue={getRandomScholar(`recent-play-${episode.id}`)}
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
          {(recentLectures.length > 0 ? recentLectures : mockEpisodes).slice(0, 3).map((episode, index) => (
            <View
              key={`recent-${episode.id}`}
              style={[tw`w-80`, index < 2 && tw`mr-4`]}
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
          {(featuredLectures.length > 0 ? featuredLectures : mockEpisodes).slice(0, 3).map((item, index) => (
            <View
              key={`featured-${item.id}`}
              style={[tw`w-80`, index < 2 && tw`mr-4`]}
            >
              <Card
                variant="landscape"
                data={item}
                onPress={() => {
                  if ("durationSec" in item) {
                    handleEpisodePress(item);
                  } else {
                    // Handle series press - navigate to series page
                    console.log("Series pressed:", item.title);
                  }
                }}
                showTime={"durationSec" in item}
                showMeta={true}
                metaValue={getRandomScholar(`featured-${item.id}`)}
                showBadge={!("durationSec" in item)}
                badgeText="DN"
              />
            </View>
          ))}
        </Row>

        {/* Trending Lectures */}
        <Row title="Trending" onSeeAll={() => router.push("/section/trending")}>
          {(trendingLectures.length > 0 ? trendingLectures : mockEpisodes)
            .concat(mockEpisodes, mockEpisodes, mockEpisodes, mockEpisodes)
            .slice(0, 15)
            .map((episode, index) => (
              <View
                key={`trending-${episode.id}-${index}`}
                style={tw`${index < 14 ? "mr-4" : ""}`}
              >
                <View style={{ width: 140 }}>
                  <Card
                    variant="square"
                    data={episode}
                    onPress={() => handleEpisodePress(episode)}
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
