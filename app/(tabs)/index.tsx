import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, CardSkeleton } from "../../src/components/molecules";
import { SearchBar } from "../../src/components/molecules/SearchBar";
import { ActionGrid } from "../../src/components/organisms/ActionGrid";
import { HeroCarousel } from "../../src/components/organisms/HeroCarousel";
import { HeroCarouselSkeleton } from "../../src/components/organisms/HeroCarousel.skeleton";
import { Row } from "../../src/components/organisms/Row";
import { usePopularLectures } from "../../src/hooks/usePopularLectures";
import { useQuranAlbums } from "../../src/hooks/useQuranAlbums";
import { useRecentlyPlayedLectures } from "../../src/hooks/useRecentlyPlayedLectures";
import { useTrending } from "../../src/hooks/useTrending";
import { QuranAlbum } from "../../src/services/api/quran.api";
import { usePlayerStore } from "../../src/stores";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode } from "../../src/types/types";

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



export default function HomeScreen() {
  const playerStore = usePlayerStore();
  const { playEpisode } = playerStore;


  // Fetch popular lectures for the carousel
  const { episodes: popularEpisodes, loading: popularLoading, error: popularError } = usePopularLectures(10);

  // Fetch trending lectures for the 'Recently Posted' section
  const { lectures: trendingLectures, loading: trendingLoading, error: trendingError } = useTrending({ limit: 10 });

  // Fetch Quran albums for the 'Quran Recitations' section
  const { albums: quranAlbums, loading: quranLoading, error: quranError } = useQuranAlbums({ limit: 10 });

  // Fetch recently played lectures using the custom hook
  const { lectures: recentlyPlayed, loading: recentlyPlayedLoading, error: recentlyPlayedError } = useRecentlyPlayedLectures(10);




  // Preload hero images (popular or mock) so the carousel feels instant
  useEffect(() => {
    const heroSource = popularEpisodes.length > 0
      ? popularEpisodes
      : mockEpisodes.slice(0, 5);

    const uris = heroSource
      .map((episode) => episode.coverUrl)
      .filter(Boolean);

    uris.forEach((uri) => {
      ExpoImage.prefetch(uri as string).catch(() => {
        // Ignore individual prefetch failures
      });
    });
  }, [popularEpisodes]);


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

  const handleCarouselItemPress = (episode: Episode) => {
    router.push(`/lecture/${episode.id}`);
  };

  const handleAlbumPress = (album: QuranAlbum) => {
    router.push(`/quran-reciter/${album.id}`);
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
        // Extra bottom padding so content never sits under the mini-player + tab bar
        contentContainerStyle={tw`pb-40`}
        accessibilityLabel="Home content"
      >
        {/* Hero Carousel - Popular Lectures */}
        {popularLoading ? (
          <HeroCarouselSkeleton />
        ) : popularError ? (
          <View style={tw`h-56 items-center justify-center px-6`}>
            <Text style={tw`text-white text-center`}>Failed to load popular lectures</Text>
            <Text style={tw`text-gray-400 text-sm text-center mt-1`}>Using offline content</Text>
            <HeroCarousel
              items={mockEpisodes.slice(0, 5)}
              onItemPress={handleCarouselItemPress}
              onPlayPress={handleEpisodePress}
            />
          </View>
        ) : popularEpisodes.length > 0 ? (
          <HeroCarousel
            items={popularEpisodes}
            onItemPress={handleCarouselItemPress}
            onPlayPress={handleEpisodePress}
          />
        ) : (
          // Fallback to mock data if no popular lectures
          <HeroCarousel
            items={mockEpisodes.slice(0, 5)}
            onItemPress={handleCarouselItemPress}
            onPlayPress={handleEpisodePress}
          />
        )}

        {/* Action Grid */}
        <ActionGrid />

        {/* Recently Played */}
        {recentlyPlayedLoading ? (
          <Row title="Recently Played" subtitle="Continue where you left off">
            <View style={tw`flex-row`}>
              {[...Array(3)].map((_, index) => (
                <View key={`skeleton-recently-played-${index}`} style={tw`mr-4 w-80`}>
                  <CardSkeleton variant="landscape" />
                </View>
              ))}
            </View>
          </Row>
        ) : recentlyPlayedError ? (
          <View style={tw`h-40 items-center justify-center px-6`}>
            <Text style={tw`text-white text-center`}>Failed to load recently played</Text>
          </View>
        ) : recentlyPlayed.length > 0 ? (
          <Row
            title="Recently Played"
            subtitle="Continue where you left off"
            onSeeAll={() => router.push("/section/recently-played")}
          >
            {recentlyPlayed.map((episode, index) => (
              <View
                key={`recently-played-${episode.id}`}
                style={tw`${index < recentlyPlayed.length - 1 ? "mr-4" : ""} w-80`}>
                <Card
                  variant="landscape"
                  data={episode}
                  onPress={() => handleCarouselItemPress(episode)}
                  playOnPress={false}
                  showTime={true}
                  showMeta={true}
                  metaValue={episode.lecturerName || "Unknown"}
                  onMorePress={() => console.log('More options pressed for episode:', episode.id)}
                />
              </View>
            ))}
          </Row>
        ) : null}

        {/* Recently Posted */}
        {trendingLoading ? (
          <Row
            title="Recently Posted"
            subtitle="Latest content from our scholars"
          >
            <View style={tw`flex-row`}>
              {[...Array(3)].map((_, index) => (
                <View key={`skeleton-trending-${index}`} style={tw`mr-4 w-80`}>
                  <CardSkeleton variant="landscape" />
                </View>
              ))}
            </View>
          </Row>
        ) : trendingError ? (
          <View style={tw`h-40 items-center justify-center px-6`}>
            <Text style={tw`text-white text-center`}>Failed to load recently posted</Text>
          </View>
        ) : trendingLectures.length > 0 ? (
          <Row
            title="Recently Posted"
            subtitle="Latest content from our scholars"
            onSeeAll={() => router.push("/section/recently-posted")}
          >
            {trendingLectures.map((episode, index) => (
              <View
                key={`recent-${episode.id}`}
                style={tw`${index < trendingLectures.length - 1 ? "mr-4" : ""} w-80`}>
                <Card
                  variant="landscape"
                  data={episode}
                  onPress={() => handleCarouselItemPress(episode)}
                  playOnPress={false}
                  showTime={true}
                  showMeta={true}
                  metaValue={episode.lecturerName || "Unknown"}
                  onMorePress={() => console.log('More options pressed for episode:', episode.id)}
                />
              </View>
            ))}
          </Row>
        ) : null}

        {/* Quran Recitations */}
        {quranLoading ? (
          <Row title="Quran Recitations">
            <View style={tw`flex-row`}>
              {[...Array(3)].map((_, index) => (
                <View key={`skeleton-quran-${index}`} style={tw`mr-4`}>
                  <CardSkeleton variant="square" />
                </View>
              ))}
            </View>
          </Row>
        ) : quranError ? (
          <View style={tw`h-40 items-center justify-center px-6`}>
            <Text style={tw`text-white text-center`}>Failed to load Quran recitations</Text>
          </View>
        ) : quranAlbums.length > 0 ? (
          <Row
            title="Quran Recitations"
            onSeeAll={() => router.push("/section/quran-recitations")}
          >
            {quranAlbums.map((album, index) => (
              <View
                key={`quran-${album.id}-${index}`}
                style={tw`${index < quranAlbums.length - 1 ? "mr-4" : ""}`}>
                <View style={{ width: 140 }}>
                  <Card
                    variant="square"
                    data={{
                      id: album.id,
                      title: album.name,
                      durationSec: 0,
                      coverUrl: album.img || album.alb_thumbnail,
                      audioUrl: '',
                      seriesId: '',
                      plays: album.views || 0,
                      liked: false,
                      language: album.language || '',
                      downloads: album.downloads || 0,
                      createdAt: album.post_date || '',
                      lecturerName: album.name,
                    }}
                    onPress={() => handleAlbumPress(album)}
                    playOnPress={false}
                    showMeta={true}
                    metaValue={album.name}
                  />
                </View>
              </View>
            ))}
          </Row>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
