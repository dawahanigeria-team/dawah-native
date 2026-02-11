import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlashList } from "../../src/components/adapters/flashListCompat";
import {
  Dimensions,
  FlatList,
  Image,
  InteractionManager,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../src/components/atoms";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { Card } from "../../src/components/molecules/Card";
import { CardSkeleton } from "../../src/components/molecules/Card.skeleton";
import { useUnreadAnnouncementsCount } from "../../src/hooks/useAnnouncements";
import { usePopularLecturesWithCache } from "../../src/hooks/usePopularLecturesWithCache";
import { useQuranAlbums } from "../../src/hooks/useQuranAlbums";
import { useRecentlyPlayedLectures } from "../../src/hooks/useRecentlyPlayedLectures";
import { useTheme } from "../../src/hooks/useTheme";
import { useTrending } from "../../src/hooks/useTrending";
import { QuranAlbum } from "../../src/services/api/quran.api";
import { useAuthStore, usePlayerActions } from "../../src/stores";
import tw from "../../src/theme/twrnc";
import { SearchLecture } from "../../src/types/api.types";
import { Episode } from "../../src/types/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 280;
const CARD_SPACING = 12;
const HERO_HEIGHT = 200;
const PREFETCH_LIMIT = 5;
const IS_ANDROID = Platform.OS === "android";

// Get greeting based on time of day (Arabic greetings)
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Sabah al-Khayr"; // Good Morning
  if (hour < 17) return "Masa al-Khayr"; // Good Afternoon/Evening
  return "Assalamu Alaikum"; // Peace be upon you
};

// Quick action items for the grid
const QUICK_ACTIONS = [
  {
    id: "chart",
    title: "Charts",
    icon: "trending-up" as const,
    route: "/charts",
  },
  {
    id: "lecturers",
    title: "Lecturers",
    icon: "people" as const,
    route: "/lecturers",
  },
  {
    id: "playlists",
    title: "Playlists",
    icon: "list" as const,
    route: "/playlists",
  },
  {
    id: "ramadan",
    title: "Ramadan",
    icon: "moon" as const,
    route: "/ramadan-tafsir",
  },
  {
    id: "quran",
    title: "Quran",
    icon: "book" as const,
    route: "/section/quran-recitations",
  },
  {
    id: "trending",
    title: "Trending",
    icon: "flame" as const,
    route: "/section/trending",
  },
];

export default function HomeScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <HomeScreen />
    </ErrorBoundary>
  );
}

function HomeScreen() {
  const { playEpisode } = usePlayerActions();
  const { colors } = useTheme();
  const [greeting] = useState(getGreeting());
  const [searchValue, setSearchValue] = useState("");
  const { user } = useAuthStore();

  const unreadCount = useUnreadAnnouncementsCount();

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push("/search");
    }
  }, [searchValue]);

  const handleMicPress = useCallback(() => {
    router.push("/search?voice=true");
  }, []);

  // Data fetching
  const { lectures: popularLectures, isLoading: popularLoading } =
    usePopularLecturesWithCache();

  const { lectures: trendingLectures, loading: trendingLoading } = useTrending({
    limit: 10,
  });

  const { albums: quranAlbumsRaw, loading: quranLoading } = useQuranAlbums({
    limit: 10,
  });

  const quranAlbums = useMemo(() => {
    const seen = new Set<string>();
    return quranAlbumsRaw.filter((album) => {
      const name = album.name?.toLowerCase().trim();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [quranAlbumsRaw]);

  const { lectures: recentlyPlayed, loading: recentlyPlayedLoading } =
    useRecentlyPlayedLectures(10);

  const [popularEpisodes, setPopularEpisodes] = useState<Episode[]>([]);

  const parseDuration = useCallback((duration: string | undefined): number => {
    if (!duration) return 0;
    const parts = duration.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }, []);

  const buildPopularEpisodes = useCallback(
    (lectures: SearchLecture[]): Episode[] => {
      return lectures.map((lecture, index) => {
        const lectureRecord = lecture as unknown as Record<string, unknown>;
        return {
          id: String(
            lecture.nid || lecture.id || `lecture-${Date.now()}-${index}`,
          ),
          title: lecture.Title || lecture.mp3_title || "Untitled Lecture",
          durationSec: parseDuration(
            lecture.duration || lecture.mp3_duration || lecture.Duration,
          ),
          coverUrl:
            lecture.img || lecture.lecturer_image || lecture.CoverUrl || "",
          audioUrl: lecture.audio || lecture.mp3_url || lecture.AudioUrl || "",
          seriesId: "",
          plays: parseInt(String(lecture.views || lecture.Plays || "0")) || 0,
          liked: false,
          language:
            lecture.lang ||
            lecture.language ||
            (lectureRecord.language_name as string) ||
            "Unknown",
          downloads:
            parseInt(String(lecture.downloads || lecture.Downloads || "0")) ||
            0,
          createdAt:
            lecture.created_at || lecture.CreatedAt || new Date().toISOString(),
          lecturerName:
            lecture.rpname ||
            lecture.lecturer_name ||
            (lectureRecord.LecturerName as string) ||
            undefined,
        } as Episode;
      });
    },
    [parseDuration],
  );

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const lectures = (popularLectures as SearchLecture[]) || [];
      setPopularEpisodes(buildPopularEpisodes(lectures));
    });
    return () => task.cancel?.();
  }, [popularLectures, buildPopularEpisodes]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const uris = popularEpisodes.map((e) => e.coverUrl).filter(Boolean);
      const uniqueUris = Array.from(new Set(uris)).slice(0, PREFETCH_LIMIT);
      uniqueUris.forEach((uri) => {
        ExpoImage.prefetch(uri as string).catch(() => {});
      });
    });
    return () => task.cancel?.();
  }, [popularEpisodes]);

  // Handlers
  const handleEpisodePress = useCallback(
    async (episode: Episode) => {
      try {
        await playEpisode(episode);
      } catch (error) {
        console.error("Error playing episode:", error);
      }
    },
    [playEpisode],
  );

  const handleCarouselItemPress = useCallback((episode: Episode) => {
    router.push(`/lecture/${episode.id}`);
  }, []);

  const handleAlbumPress = useCallback((album: QuranAlbum) => {
    router.push(`/quran-reciter/${album.id}`);
  }, []);

  // Render Hero Carousel Item
  const renderHeroItem = useCallback(
    ({ item, index }: { item: Episode; index: number }) => (
      <Animated.View
        entering={IS_ANDROID ? undefined : FadeInRight.delay(index * 100).duration(400)}
        style={[styles.heroCard, { width: SCREEN_WIDTH - 32 }]}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => handleCarouselItemPress(item)}
          style={tw`flex-1`}
        >
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.heroGradient}
          />
          {/* Play Button */}
          <TouchableOpacity
            onPress={() => handleEpisodePress(item)}
            style={[
              styles.heroPlayButton,
              { backgroundColor: colors.brand.primary },
            ]}
            activeOpacity={0.9}
          >
            <Ionicons name="play" size={24} color={colors.fixed.black} />
          </TouchableOpacity>
          {/* Content */}
          <View style={styles.heroContent}>
            <View
              style={[
                styles.heroBadge,
                { backgroundColor: colors.brand.primary },
              ]}
            >
              <Text
                variant="caption2"
                weight="bold"
                style={{ color: colors.fixed.black }}
              >
                FEATURED
              </Text>
            </View>
            <Text
              variant="title2"
              weight="bold"
              numberOfLines={2}
              style={[styles.heroTitle, { color: colors.fixed.white }]}
            >
              {item.title}
            </Text>
            <View style={tw`flex-row items-center mt-1`}>
              <Text variant="caption1" style={styles.heroMetaText}>
                {item.lecturerName || "Unknown Scholar"}
              </Text>
              <View
                style={[tw`w-1 h-1 rounded-full mx-2`, styles.heroMetaDot]}
              />
              <Text variant="caption1" style={styles.heroMetaText}>
                {Math.floor(item.durationSec / 60)} min
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors, handleCarouselItemPress, handleEpisodePress],
  );

  // Render Quick Action
  const renderQuickAction = useCallback(
    (action: (typeof QUICK_ACTIONS)[0], index: number) => (
      <Animated.View
        key={action.id}
        entering={IS_ANDROID ? undefined : FadeInDown.delay(index * 50).duration(300)}
      >
        <TouchableOpacity
          onPress={() =>
            router.push(action.route as Parameters<typeof router.push>[0])
          }
          style={[
            styles.quickAction,
            { backgroundColor: colors.system.background.secondary },
          ]}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.quickActionIcon,
              { backgroundColor: colors.brand.primary + "20" },
            ]}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={colors.brand.primary}
            />
          </View>
          <Text variant="caption1" color="label" weight="medium">
            {action.title}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors],
  );

  // Render Section Header
  const renderSectionHeader = useCallback(
    (title: string, subtitle?: string, onSeeAll?: () => void) => (
      <View style={styles.sectionHeader}>
        <View style={tw`flex-1`}>
          <Text variant="title3" color="label" weight="bold">
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption1" color="secondaryLabel" style={tw`mt-0.5`}>
              {subtitle}
            </Text>
          )}
        </View>
        {onSeeAll && (
          <TouchableOpacity
            onPress={onSeeAll}
            style={tw`flex-row items-center`}
            activeOpacity={0.7}
          >
            <Text variant="subheadline" weight="semibold" color="brand">
              See All
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.brand.primary}
              style={tw`ml-1`}
            />
          </TouchableOpacity>
        )}
      </View>
    ),
    [colors],
  );

  // Render Lecture Card
  const renderLectureCard = useCallback(
    ({ item, index }: { item: Episode; index: number }) => {
      if (!item?.id) return null;
      return (
      <Animated.View
        entering={IS_ANDROID ? undefined : FadeInRight.delay(index * 50).duration(300)}
        style={{ width: CARD_WIDTH, marginRight: CARD_SPACING }}
      >
          <Card
            variant="landscape"
            data={item}
            onPress={() => handleCarouselItemPress(item)}
            playOnPress={false}
            showTime={true}
            showMeta={true}
            metaValue={item.lecturerName || "Unknown"}
          />
        </Animated.View>
      );
    },
    [handleCarouselItemPress],
  );

  // Render Quran Album Card
  const renderQuranCard = useCallback(
    ({ item, index }: { item: QuranAlbum; index: number }) => {
      if (!item?.id) return null;
      return (
      <Animated.View
        entering={IS_ANDROID ? undefined : FadeInRight.delay(index * 50).duration(300)}
        style={styles.quranCardWrapper}
      >
          <TouchableOpacity
            onPress={() => handleAlbumPress(item)}
            activeOpacity={0.8}
            style={[
              tw`rounded-2xl overflow-hidden`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            <Image
              source={{ uri: item.img || item.alb_thumbnail }}
              style={tw`w-full aspect-square`}
              resizeMode="cover"
            />
            <View style={tw`p-2`}>
              <Text
                variant="footnote"
                color="label"
                weight="medium"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text variant="caption2" color="secondaryLabel" style={tw`mt-1`}>
                {item.lec_no} Surahs
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, handleAlbumPress],
  );

  // Render skeleton loaders
  const renderSkeletons = (
    count: number = 3,
    variant: "landscape" | "square" = "landscape",
  ) => {
    const getSkeletonCardStyle = () => [
      styles.skeletonCardWrapper,
      { width: variant === "landscape" ? CARD_WIDTH : 140 },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-4`}
      >
        {[...Array(count)].map((_, i) => (
          <View key={i} style={getSkeletonCardStyle()}>
            <CardSkeleton variant={variant} />
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-40`}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Header */}
        <Animated.View
          entering={IS_ANDROID ? undefined : FadeIn.duration(400)}
          style={[
            styles.header,
            { backgroundColor: colors.system.background.primary },
          ]}
        >
          {/* Top Row: Greeting & Notifications */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                  { backgroundColor: colors.brand.primary },
                ]}
              >
                <Text
                  variant="headline"
                  weight="bold"
                  style={{ color: colors.fixed.black }}
                >
                  DN
                </Text>
              </View>
              <View>
                <Text variant="caption1" color="secondaryLabel">
                  {greeting}
                </Text>
                <Text variant="headline" color="label" weight="semibold">
                  {user?.username || "Marhaban"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/inbox")}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: colors.system.background.secondary },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.system.label.primary}
              />
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.notificationBadge,
                    { backgroundColor: colors.semantic.red },
                  ]}
                >
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={colors.system.label.tertiary}
            />
            <TextInput
              style={[
                tw`flex-1 ml-3`,
                styles.searchInput,
                { color: colors.system.label.primary },
              ]}
              placeholder="Search lectures, scholars..."
              placeholderTextColor={colors.system.label.tertiary}
              value={searchValue}
              onChangeText={setSearchValue}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchValue.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchValue("")}
                style={tw`w-8 h-8 rounded-lg items-center justify-center`}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.system.label.tertiary}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleMicPress}
                style={[
                  tw`w-8 h-8 rounded-lg items-center justify-center`,
                  { backgroundColor: colors.system.fill.tertiary },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="mic"
                  size={18}
                  color={colors.system.label.secondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Hero Carousel */}
        <View style={tw`mt-4`}>
          {popularLoading ? (
            <View
              style={[
                styles.heroSkeleton,
                { backgroundColor: colors.system.background.secondary },
              ]}
            />
          ) : popularEpisodes.length > 0 ? (
            <FlatList
              data={popularEpisodes.slice(0, 5)}
              renderItem={renderHeroItem}
              keyExtractor={(item) => `hero-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4`}
              snapToInterval={SCREEN_WIDTH - 16}
              snapToAlignment="start"
              decelerationRate="fast"
            />
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={tw`px-4 mt-6`}>
          <Text variant="title3" color="label" weight="bold" style={tw`mb-4`}>
            Browse
          </Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action, index) =>
              renderQuickAction(action, index),
            )}
          </View>
        </View>

        {/* Continue Listening */}
        {(recentlyPlayedLoading || recentlyPlayed.length > 0) && (
          <View style={tw`mt-8`}>
            {renderSectionHeader(
              "Continue Listening",
              "Pick up where you left off",
              () => router.push("/section/recently-played"),
            )}
            {recentlyPlayedLoading ? (
              renderSkeletons(3)
            ) : (
              <FlashList
                data={recentlyPlayed}
                renderItem={renderLectureCard}
                keyExtractor={(item) => `recent-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-4`}

              />
            )}
          </View>
        )}

        {/* Recently Posted */}
        <View style={tw`mt-8`}>
          {renderSectionHeader(
            "Fresh Content",
            "Latest from our scholars",
            () => router.push("/section/recently-posted"),
          )}
          {trendingLoading ? (
            renderSkeletons(3)
          ) : trendingLectures.length > 0 ? (
            <FlashList
              data={trendingLectures}
              renderItem={renderLectureCard}
              keyExtractor={(item) => `trending-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4`}
            />
          ) : null}
        </View>

        {/* Quran Recitations */}
        <View style={tw`mt-8`}>
          {renderSectionHeader(
            "Quran Recitations",
            "Beautiful recitations",
            () => router.push("/section/quran-recitations"),
          )}
          {quranLoading ? (
            renderSkeletons(4, "square")
          ) : quranAlbums.length > 0 ? (
            <FlashList
              data={quranAlbums}
              renderItem={renderQuranCard}
              keyExtractor={(item) => `quran-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4`}
            />
          ) : null}
        </View>

        {/* Trending */}
        <View style={tw`mt-8`}>
          {renderSectionHeader("Trending Now", "Most popular this week", () =>
            router.push("/section/trending"),
          )}
          {trendingLoading ? (
            renderSkeletons(3)
          ) : trendingLectures.length > 0 ? (
            <FlashList
              data={[...trendingLectures].reverse()}
              renderItem={renderLectureCard}
              keyExtractor={(item) => `popular-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4`}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  searchInput: {
    fontSize: 16,
  },
  heroCard: {
    height: HERO_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 16,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  heroPlayButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  heroTitle: {
    lineHeight: 26,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.8)",
  },
  heroMetaDot: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  heroSkeleton: {
    height: HERO_HEIGHT,
    marginHorizontal: 16,
    borderRadius: 20,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickAction: {
    width: (SCREEN_WIDTH - 48) / 3,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  skeletonCardWrapper: {
    marginRight: 12,
  },
  quranCardWrapper: {
    width: 140,
    marginRight: 12,
  },
});
