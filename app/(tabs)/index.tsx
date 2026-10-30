import Ionicons from "@expo/vector-icons/Ionicons";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useObserve } from "expo-observe";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InteractionManager,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "../../src/components/adapters/flashListCompat";
import { Text } from "../../src/components/atoms";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { Card } from "../../src/components/molecules/Card";
import { CardSkeleton } from "../../src/components/molecules/Card.skeleton";
import { useUnreadAnnouncementsCount } from "../../src/hooks/useAnnouncements";
import { usePopularLecturesWithCache } from "../../src/hooks/usePopularLecturesWithCache";
import { useQuranAlbums } from "../../src/hooks/useQuranAlbums";
import { useRecentlyPlayedLectures } from "../../src/hooks/useRecentlyPlayedLectures";
import { useRecent } from "../../src/hooks/useRecent";
import { useTheme } from "../../src/hooks/useTheme";
import { OBSERVE_ROUTE } from "../../src/services/config/observe.config";
import { QuranAlbum } from "../../src/services/api/quran.api";
import { useAuthStore } from "../../src/stores";
import {
  initializeListeningPreferences,
  useListeningPreferencesStore,
} from "../../src/stores/listeningPreferencesStore";
import tw from "../../src/theme/twrnc";
import { SearchLecture } from "../../src/types/api.types";
import { Episode } from "../../src/types/types";

const CARD_WIDTH = 280;
const CARD_SPACING = 12;
const IS_ANDROID = Platform.OS === "android";
const HOME_SECTION_LIMIT = IS_ANDROID ? 6 : 10;
const HOME_SKELETON_COUNT = IS_ANDROID ? 2 : 3;
const HOME_QURAN_SKELETON_COUNT = IS_ANDROID ? 2 : 4;

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
    // Replaces the old "Latest" tile: recent lectures already have the hero
    // slider at the top of this screen and the "Fresh Content" row below, so
    // the tile was a third route to the same content. Categories is the one
    // axis of the catalogue the app had no entry point for.
    id: "categories",
    title: "Categories",
    icon: "grid" as const,
    route: "/categories",
  },
  {
    id: "quran",
    title: "Quran",
    icon: "book" as const,
    route: "/section/quran-recitations",
  },
  {
    id: "library",
    title: "Library",
    icon: "library" as const,
    route: "/(tabs)/library",
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
  const guardedPush = useGuardedPush();
  // useWindowDimensions rather than a module-scope Dimensions.get(), which
  // was captured at import and never updated on rotation or resize.
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { colors } = useTheme();
  const [greeting] = useState(getGreeting());
  const [searchValue, setSearchValue] = useState("");
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { preferences, isHydrated: preferencesHydrated } =
    useListeningPreferencesStore();

  useEffect(() => {
    if (!isInitialized) return;
    void initializeListeningPreferences(isAuthenticated);
  }, [isAuthenticated, isInitialized]);

  const feedFilter = useMemo(
    () => ({
      languageIds: preferences.languageIds,
      lecturerIds: preferences.lecturerIds,
      enabled: preferencesHydrated,
    }),
    [preferences.languageIds, preferences.lecturerIds, preferencesHydrated],
  );

  const unreadCount = useUnreadAnnouncementsCount();

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    if (searchValue.trim()) {
      guardedPush(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    } else {
      guardedPush("/search");
    }
  }, [searchValue, guardedPush]);

  // Data fetching
  const {
    lectures: popularLectures,
    isLoading: popularLoading,
    error: popularError,
    refresh: refreshPopular,
  } = usePopularLecturesWithCache(feedFilter);

  const {
    lectures: recentLectures,
    loading: recentLoading,
    error: recentError,
    refetch: refetchRecent,
  } = useRecent({ limit: HOME_SECTION_LIMIT, ...feedFilter });

  const { albums: quranAlbumsRaw, loading: quranLoading } = useQuranAlbums({
    limit: HOME_SECTION_LIMIT,
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
    useRecentlyPlayedLectures(HOME_SECTION_LIMIT);

  const [popularEpisodes, setPopularEpisodes] = useState<Episode[]>([]);
  const [isRetryingHome, setIsRetryingHome] = useState(false);

  const retryPrimaryContent = useCallback(async () => {
    if (isRetryingHome) return;
    setIsRetryingHome(true);
    try {
      await Promise.allSettled([refetchRecent(), refreshPopular()]);
    } finally {
      setIsRetryingHome(false);
    }
  }, [isRetryingHome, refetchRecent, refreshPopular]);

  const primaryContentFailed =
    !recentLoading &&
    !popularLoading &&
    recentLectures.length === 0 &&
    popularLectures.length === 0 &&
    Boolean(recentError || popularError);

  // Time to interactive, as the user would define it: the launch is over when
  // there is something to tap, not when the shell has mounted.
  //
  // The mark is taken when loading RESOLVES, not when content arrives. A launch
  // that ends in an error screen is still a launch, and the slowest ones are
  // the likeliest to end that way — marking only on success would quietly drop
  // the bad tail and leave a flattering median. `had_content` separates the two
  // back out in the dashboard.
  const { markInteractive } = useObserve();
  const hasMarkedInteractive = useRef(false);

  useEffect(() => {
    if (hasMarkedInteractive.current) return;
    if (recentLoading) return;

    hasMarkedInteractive.current = true;
    markInteractive({
      routeName: OBSERVE_ROUTE.home,
      params: {
        had_content: recentLectures.length > 0,
        recent_count: recentLectures.length,
      },
    });
  }, [markInteractive, recentLectures.length, recentLoading]);

  const trendingNowLectures = useMemo(() => {
    return popularEpisodes.slice(0, HOME_SECTION_LIMIT);
  }, [popularEpisodes]);

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
            lecture.Language ||
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


  // Handlers
  const handleCarouselItemPress = useCallback((episode: Episode) => {
    guardedPush(`/lecture/${episode.id}`);
  }, [guardedPush]);

  const handleAlbumPress = useCallback((album: QuranAlbum) => {
    guardedPush({
      pathname: `/quran-reciter/${album.id}`,
      params: {
        albumIds: (album.albumIds || [album.id]).join(','),
        reciterId: album.reciterId,
        reciterName: album.name,
      },
    } as any);
  }, [guardedPush]);

  // Render Quick Action
  const renderQuickAction = useCallback(
    (action: (typeof QUICK_ACTIONS)[0]) => (
      // A plain View, deliberately. Wrapped in View these tiles
      // rendered at near-zero opacity — Charts came through, Quran and Library
      // were barely visible, and Lecturers, Playlists and Categories did not
      // paint at all, so half of Browse was invisible and only tappable by
      // accident. It is not the entering animation: removing that prop changed
      // nothing, and swapping View for View fixed it outright. Six
      // static tiles do not need a staggered fade badly enough to risk that.
      <View key={action.id}>
        <TouchableOpacity
          onPress={() =>
            guardedPush(action.route as Parameters<typeof router.push>[0])
          }
          style={[
            styles.quickAction,
            // Width is applied here rather than in StyleSheet.create, which is
            // evaluated once at module load and so cannot read a hook value.
            { width: (SCREEN_WIDTH - 48) / 3 },
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
      </View>
    ),
    [colors, SCREEN_WIDTH, guardedPush],
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
    ({ item }: { item: Episode; index: number }) => {
      if (!item?.id) return null;
      return (
        <View
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
        </View>
      );
    },
    [handleCarouselItemPress],
  );

  const renderTrendingCard = useCallback(
    ({ item, index }: { item: Episode; index: number }) => {
      if (!item?.id) return null;
      return (
        <View
          style={{ width: CARD_WIDTH, marginRight: CARD_SPACING }}
        >
          <View style={styles.trendingCardWrapper}>
            <View
              style={[
                styles.rankBadge,
                { backgroundColor: index < 3 ? colors.brand.primary : colors.system.fill.tertiary },
              ]}
            >
              <Text
                variant="caption1"
                weight="bold"
                style={{ color: index < 3 ? colors.fixed.black : colors.system.label.secondary }}
              >
                #{index + 1}
              </Text>
            </View>
            <Card
              variant="landscape"
              data={item}
              onPress={() => handleCarouselItemPress(item)}
              playOnPress={false}
              showTime={true}
              showMeta={true}
              metaValue={item.lecturerName || "Unknown Scholar"}
            />
          </View>
        </View>
      );
    },
    [colors, handleCarouselItemPress],
  );

  // Render Quran Album Card
  const renderQuranCard = useCallback(
    ({ item }: { item: QuranAlbum; index: number }) => {
      if (!item?.id) return null;
      return (
        <View
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
            <ExpoImage
              source={{ uri: item.img || item.alb_thumbnail }}
              style={tw`w-full aspect-square`}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
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
        </View>
      );
    },
    [colors, handleAlbumPress],
  );

  // Render skeleton loaders
  const renderSkeletons = (
    count: number = HOME_SKELETON_COUNT,
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
        <View
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
            <View style={tw`flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => router.push("/listening-preferences" as any)}
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center`,
                  { backgroundColor: colors.system.background.secondary },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Edit listening preferences"
              >
                <Ionicons
                  name="options-outline"
                  size={21}
                  color={colors.system.label.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/inbox")}
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center`,
                  { backgroundColor: colors.system.background.secondary },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
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
            {searchValue.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchValue("")}
                style={tw`w-8 h-8 rounded-lg items-center justify-center`}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.system.label.tertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!preferences.configured && preferencesHydrated && (
          <TouchableOpacity
            onPress={() => router.push("/listening-preferences" as any)}
            activeOpacity={0.85}
            style={[
              styles.preferencePrompt,
              { backgroundColor: colors.brand.primary + "18" },
            ]}
          >
            <View style={[styles.preferencePromptIcon, { backgroundColor: colors.brand.primary }]}>
              <Ionicons name="sparkles" size={20} color={colors.fixed.black} />
            </View>
            <View style={tw`flex-1`}>
              <Text variant="headline" color="label" weight="semibold">
                Make Home yours
              </Text>
              <Text variant="footnote" color="secondaryLabel" style={tw`mt-1`}>
                Choose the languages and scholars you want to hear.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.system.label.secondary} />
          </TouchableOpacity>
        )}

        <View style={tw`mt-7`}>
          {renderSectionHeader(
            preferences.configured ? "For You" : "Trending Now",
            preferences.configured
              ? "Based on your languages and scholars"
              : "What the community is listening to",
            () =>
            guardedPush("/section/trending"),
          )}
          {primaryContentFailed ? (
            <View
              style={[
                styles.contentRecoveryCard,
                { backgroundColor: colors.system.background.secondary },
              ]}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={colors.system.label.secondary}
              />
              <View style={tw`flex-1 ml-3`}>
                <Text variant="headline" color="label" weight="semibold">
                  Content is taking longer to load
                </Text>
                <Text variant="footnote" color="secondaryLabel" style={tw`mt-1`}>
                  Check your connection and try again. You can still browse the app below.
                </Text>
              </View>
              <TouchableOpacity
                onPress={retryPrimaryContent}
                disabled={isRetryingHome}
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.brand.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading home content"
              >
                <Ionicons
                  name={isRetryingHome ? "hourglass-outline" : "refresh"}
                  size={20}
                  color={colors.fixed.black}
                />
              </TouchableOpacity>
            </View>
          ) : popularLoading ? (
            renderSkeletons()
          ) : trendingNowLectures.length > 0 ? (
            <FlashList
              data={trendingNowLectures}
              renderItem={renderTrendingCard}
              keyExtractor={(item) => `popular-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4`}
            />
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={tw`px-4 mt-6`}>
          <Text variant="title3" color="label" weight="bold" style={tw`mb-4`}>
            Browse
          </Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => renderQuickAction(action))}
          </View>
        </View>

        {/* Continue Listening */}
        {(recentlyPlayedLoading || recentlyPlayed.length > 0) && (
          <View style={tw`mt-8`}>
            {renderSectionHeader(
              "Continue Listening",
              "Pick up where you left off",
              () => guardedPush("/section/recently-played"),
            )}
            {recentlyPlayedLoading ? (
              renderSkeletons()
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
            () => guardedPush("/section/recently-posted"),
          )}
          {recentLoading ? (
            renderSkeletons()
          ) : recentLectures.length > 0 ? (
            <FlashList
              data={recentLectures}
              renderItem={renderLectureCard}
              keyExtractor={(item) => `recent-${item.id}`}
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
            () => guardedPush("/section/quran-recitations"),
          )}
          {quranLoading ? (
            renderSkeletons(HOME_QURAN_SKELETON_COUNT, "square")
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
  contentRecoveryCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  preferencePrompt: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  preferencePromptIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickAction: {
    // width is set at the call site from useWindowDimensions — see above.
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
  trendingCardWrapper: {
    position: "relative",
    paddingTop: 12,
  },
  rankBadge: {
    position: "absolute",
    zIndex: 2,
    top: 0,
    left: 12,
    minWidth: 38,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
