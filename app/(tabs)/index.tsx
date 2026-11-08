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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "../../src/components/adapters/flashListCompat";
import { Text } from "../../src/components/atoms";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { ContinueHero } from "../../src/components/organisms/ContinueHero";
import { LectureRow } from "../../src/components/molecules/LectureRow";
import { episodeToRow } from "../../src/components/molecules/lectureRowModel";
import { CardSkeleton } from "../../src/components/molecules/Card.skeleton";
import { useUnreadAnnouncementsCount } from "../../src/hooks/useAnnouncements";
import { usePopularLecturesWithCache } from "../../src/hooks/usePopularLecturesWithCache";
import { useQuranAlbums } from "../../src/hooks/useQuranAlbums";
import { useContinueListening } from "../../src/hooks/useContinueListening";
import { useRecent } from "../../src/hooks/useRecent";
import { useTheme } from "../../src/hooks/useTheme";
import { OBSERVE_ROUTE } from "../../src/services/config/observe.config";
import { QuranAlbum } from "../../src/services/api/quran.api";
import { playerStore, useAuthStore, usePlayerActions } from "../../src/stores";
import {
  initializeListeningPreferences,
  useListeningPreferencesStore,
} from "../../src/stores/listeningPreferencesStore";
import tw from "../../src/theme/twrnc";
import { SearchLecture } from "../../src/types/api.types";
import { Episode } from "../../src/types/types";

const FEED_ROW_COUNT = 4;
const QURAN_CARD_WIDTH = 140;
const IS_ANDROID = Platform.OS === "android";
const HOME_SECTION_LIMIT = IS_ANDROID ? 6 : 10;
const FEED_SKELETON_COUNT = 3;
const HOME_QURAN_SKELETON_COUNT = IS_ANDROID ? 2 : 4;

type FeedTab = "popular" | "recent";

export default function HomeScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <HomeScreen />
    </ErrorBoundary>
  );
}

function HomeScreen() {
  const guardedPush = useGuardedPush();
  const { colors } = useTheme();
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

  const { playEpisode } = usePlayerActions();
  const currentEpisodeId = playerStore.use((state) => state.currentEpisode?.id);
  const isPlaying = playerStore.use((state) => state.isPlaying);
  const continueListening = useContinueListening(currentEpisodeId);
  const [feedTab, setFeedTab] = useState<FeedTab>("popular");

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
            style={tw`flex-row items-center min-h-[44px]`}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
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

  const renderQuranSkeletons = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`px-4`}
    >
      {[...Array(HOME_QURAN_SKELETON_COUNT)].map((_, i) => (
        <View key={i} style={styles.quranCardWrapper}>
          <CardSkeleton variant="square" />
        </View>
      ))}
    </ScrollView>
  );

  const feedOptions: { key: FeedTab; label: string }[] = [
    { key: "popular", label: preferences.configured ? "For you" : "Most heard" },
    { key: "recent", label: "Newly added" },
  ];
  const feedEpisodes = (feedTab === "popular" ? trendingNowLectures : recentLectures).slice(
    0,
    FEED_ROW_COUNT,
  );
  const feedLoading = feedTab === "popular" ? popularLoading : recentLoading;

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
          <View style={tw`flex-row items-center justify-between`}>
            <Text variant="title1" accessibilityRole="header" numberOfLines={1} style={tw`flex-1 mr-2`}>
              Assalamu alaikum
            </Text>
            <View style={tw`flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => router.push("/inbox")}
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center`,
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
              <TouchableOpacity
                onPress={() => guardedPush("/profile")}
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center`,
                  { backgroundColor: colors.system.background.tertiary },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Profile"
              >
                {user?.username ? (
                  <Text variant="footnote" weight="semibold">
                    {user.username.substring(0, 2).toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons name="person" size={20} color={colors.system.label.primary} />
                )}
              </TouchableOpacity>
            </View>
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
              <Ionicons name="sparkles" size={20} color={colors.brand.onPrimary} />
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

        {continueListening && (
          <View style={tw`mt-3`}>
            <ContinueHero
              episode={continueListening.episode}
              positionSec={continueListening.positionSec}
              onResume={() =>
                void playEpisode(continueListening.episode, {
                  startAt: continueListening.positionSec,
                })
              }
              onOpen={() => handleCarouselItemPress(continueListening.episode)}
            />
          </View>
        )}

        <View style={tw`mt-6`}>
          <View style={styles.feedTabs} accessibilityRole="tablist">
            {feedOptions.map((option) => {
              const selected = feedTab === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setFeedTab(option.key)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={[
                    styles.feedTab,
                    {
                      backgroundColor: selected
                        ? colors.brand.primary
                        : colors.system.background.secondary,
                    },
                  ]}
                >
                  <Text
                    variant="subheadline"
                    weight="semibold"
                    style={{ color: selected ? colors.brand.onPrimary : colors.system.label.primary }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => router.push("/listening-preferences" as any)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit listening preferences"
              style={styles.adjustFeed}
            >
              <Ionicons name="options-outline" size={22} color={colors.system.label.primary} />
            </TouchableOpacity>
          </View>
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
                  color={colors.brand.onPrimary}
                />
              </TouchableOpacity>
            </View>
          ) : feedLoading && feedEpisodes.length === 0 ? (
            <View style={tw`px-4`}>
              {[...Array(FEED_SKELETON_COUNT)].map((_, i) => (
                <CardSkeleton key={i} variant="list" />
              ))}
            </View>
          ) : (
            <>
              {feedEpisodes.map((episode) => (
                <LectureRow
                  key={`feed-${episode.id}`}
                  lecture={episodeToRow(episode)}
                  playback={
                    episode.id === currentEpisodeId ? (isPlaying ? "playing" : "paused") : "idle"
                  }
                  onPress={() => handleCarouselItemPress(episode)}
                  onPlay={() => void playEpisode(episode)}
                />
              ))}
              {feedEpisodes.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    guardedPush(feedTab === "popular" ? "/section/trending" : "/section/recently-posted")
                  }
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  style={styles.seeAll}
                >
                  <Text variant="subheadline" weight="semibold" color="brand">
                    See all lectures
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Quran Recitations */}
        <View style={tw`mt-8`}>
          {renderSectionHeader(
            "Quran Recitations",
            "Beautiful recitations",
            () => guardedPush("/section/quran-recitations"),
          )}
          {quranLoading ? (
            renderQuranSkeletons()
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  feedTabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  adjustFeed: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  feedTab: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  seeAll: {
    minHeight: 44,
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
  quranCardWrapper: {
    width: QURAN_CARD_WIDTH,
    marginRight: 12,
  },
});
