import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useGuardedPush } from '../../src/navigation/useGuardedPush';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Share,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '../../src/components/atoms';
import { LectureRow, quranRecitationToRow, ScreenHeader } from '../../src/components/molecules';
import { useFollowGate } from '../../src/hooks/useFollowGate';
import { useSeriesResume } from '../../src/hooks/useSeriesResume';
import { useTheme } from '../../src/hooks/useTheme';
import {
  followLecturer,
  unfollowLecturer,
} from '../../src/services/api/lecturerFollow.api';
import { QuranAlbum, quranApi, QuranRecitation } from '../../src/services/api/quran.api';
import { addSentryBreadcrumb, captureSentryException } from '../../src/services/config/sentry.config';
import {
  getStoredPushToken,
  registerForPushNotificationsAsync,
} from '../../src/services/notifications.service';
import {
  getCachedLecturerFollowState,
  setCachedLecturerFollowState,
} from '../../src/services/lecturerFollowCache.service';
import { linkingService } from '../../src/services/linking.service';
import { useAuthStore, usePlayerActions, playerStore } from '../../src/stores';
import { designTokens } from '../../src/theme/designTokens';
import { Episode } from '../../src/types/types';
import {
  buildReciterFollowReturnTo,
  parseAutoFollowFlag,
} from '../../src/utils/lecturerFollowAuth';
import { appendShareSignature } from '../../src/utils/shareMessage';
import { durationToSeconds } from '../../src/utils/quran';

const QuranReciterScreen: React.FC = () => {
  const router = useRouter();
  const guardedPush = useGuardedPush();
  const { id, autoFollow, albumIds, reciterId, reciterName } = useLocalSearchParams<{
    id: string;
    autoFollow?: string;
    albumIds?: string;
    reciterId?: string;
    reciterName?: string;
  }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const shouldAutoFollow = parseAutoFollowFlag(autoFollow);
  const requestedAlbumIds = useMemo(() => (
    typeof albumIds === 'string'
      ? albumIds.split(',').map((value) => value.trim()).filter(Boolean)
      : [albumId]
  ), [albumId, albumIds]);
  const followEntityId = typeof reciterId === 'string' && reciterId !== '0' ? reciterId : albumId;
  const { playQueue } = usePlayerActions();
  const currentEpisode = playerStore.use((state) => state.currentEpisode);
  const isPlaying = playerStore.use((state) => state.isPlaying);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  const { canFollowMore, requireFollowAccess } = useFollowGate();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    // Check navigation state at call time to ensure accuracy
    // Navigation history can change during component lifecycle
    let canGoBack = false;
    try {
      canGoBack = navigation.canGoBack();
    } catch {
      canGoBack = false;
    }

    if (canGoBack) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [navigation, router]);
  const [album, setAlbum] = useState<QuranAlbum | null>(null);
  const [recitations, setRecitations] = useState<QuranRecitation[]>([]);
  const [surahQuery, setSurahQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowStateHydrating, setIsFollowStateHydrating] = useState(false);
  const autoFollowHandledRef = useRef(false);
  const followDisabled =
    isFollowLoading ||
    isFollowStateHydrating ||
    !albumId ||
    String(albumId) === '0';

  const fetchReciterData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      addSentryBreadcrumb('Fetching Quran reciter data', 'http', {
        albumId,
      });

      const response = await quranApi.getQuranAlbumDetails(albumId, requestedAlbumIds);
      setAlbum({
        ...response.album,
        name: typeof reciterName === 'string' && reciterName.trim() ? reciterName : response.album.name,
        reciterId: followEntityId,
        albumIds: requestedAlbumIds,
      });
      setRecitations(response.recitations);

      addSentryBreadcrumb('Quran reciter data loaded', 'info', {
        albumId,
        reciterName: response.album.name,
        recitationCount: response.recitations.length,
      });
    } catch (err: any) {
      console.error('Failed to fetch Quran reciter data:', err);
      setError('Failed to load recitations. Please try again.');

      captureSentryException(err, {
        component: 'QuranReciterScreen',
        action: 'fetchReciterData',
        albumId,
        level: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [albumId, requestedAlbumIds, reciterName, followEntityId]);

  useEffect(() => {
    // The route id is the external input that starts this async synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReciterData();
  }, [fetchReciterData]);

  useEffect(() => {
    let isActive = true;

    const hydrateFollowState = async () => {
      if (!followEntityId || String(followEntityId) === '0' || !isAuthenticated || !user?.id) {
        if (isActive) {
          setIsFollowing(false);
          setIsFollowStateHydrating(false);
        }
        return;
      }

      if (isActive) {
        setIsFollowStateHydrating(true);
      }

      try {
        const following = await getCachedLecturerFollowState({
          userId: user.id,
          lecturerId: followEntityId,
          type: 'reciter',
        });
        if (isActive) {
          setIsFollowing(following);
        }
      } finally {
        if (isActive) {
          setIsFollowStateHydrating(false);
        }
      }
    };

    hydrateFollowState();

    return () => {
      isActive = false;
    };
  }, [followEntityId, isAuthenticated, user?.id]);

  useEffect(() => {
    // Reset transient controls when navigating between reciters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFollowLoading(false);
    autoFollowHandledRef.current = false;
  }, [albumId]);

  const confirmEnableNotifications = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable notifications?',
        'Enable notifications to follow this reciter and get new recitation alerts.',
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true },
      );
    });
  }, []);

  const confirmSignIn = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Sign in required',
        'Please sign in to follow this reciter.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Sign In',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true },
      );
    });
  }, []);

  const navigateToSignIn = useCallback(() => {
    if (!albumId || String(albumId) === '0') return;
    guardedPush({
      pathname: '/sign-in',
      params: { returnTo: buildReciterFollowReturnTo(albumId) },
    });
  }, [albumId, guardedPush]);

  const handleFollowPress = useCallback(
    async (options: { skipAuthCheck?: boolean; forceFollow?: boolean } = {}) => {
      if (!followEntityId || String(followEntityId) === '0') {
        Alert.alert('Please wait', 'Reciter details are still loading.');
        return;
      }

      if (isFollowLoading) return;

      if (!options.skipAuthCheck && !isAuthenticated) {
        const shouldSignIn = await confirmSignIn();
        if (shouldSignIn) {
          navigateToSignIn();
        }
        return;
      }

      const shouldFollow = options.forceFollow ? true : !isFollowing;
      if (shouldFollow && !requireFollowAccess(isFollowing)) {
        return;
      }

      setIsFollowLoading(true);
      try {
        if (shouldFollow) {
          let token = await getStoredPushToken();

          if (!token) {
            const shouldEnable = await confirmEnableNotifications();
            if (!shouldEnable) {
              setIsFollowLoading(false);
              return;
            }

            token = await registerForPushNotificationsAsync();
            if (!token) {
              Alert.alert(
                'Notifications not enabled',
                'Enable notifications to follow this reciter.',
              );
              setIsFollowLoading(false);
              return;
            }
          }

          const response = await followLecturer(followEntityId, 'reciter');
          addSentryBreadcrumb('Follow reciter response', 'info', {
            response: JSON.stringify(response),
          });

          const following = response.data.following;
          setIsFollowing(following);
          if (user?.id) {
            await setCachedLecturerFollowState({
              userId: user.id,
              lecturerId: followEntityId,
              type: 'reciter',
              following,
            });
          }
        } else {
          const response = await unfollowLecturer(followEntityId, 'reciter');
          addSentryBreadcrumb('Unfollow reciter response', 'info', {
            response: JSON.stringify(response),
          });

          const following = response.data.following;
          setIsFollowing(following);
          if (user?.id) {
            await setCachedLecturerFollowState({
              userId: user.id,
              lecturerId: followEntityId,
              type: 'reciter',
              following,
            });
          }
        }
      } catch (err) {
        const apiError = err as { statusCode?: number; data?: { code?: string; feature?: string }; message?: string };
        if (
          apiError.statusCode === 403 &&
          apiError.data?.code === 'FEATURE_NOT_AVAILABLE' &&
          apiError.data?.feature === 'multi_lecturer_follow'
        ) {
          Alert.alert(
            'DN Supporter feature',
            'Free users can follow up to 2 lecturers or reciters. Become a DN Supporter to follow more.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Become a Supporter', onPress: () => router.push('/premium' as any) },
            ],
          );
          return;
        }

        const error = err instanceof Error ? err : new Error('Follow toggle failed');
        captureSentryException(error, {
          component: 'QuranReciterScreen',
          action: isFollowing ? 'unfollow-reciter' : 'follow-reciter',
          reciterId: albumId,
        });
        Alert.alert('Something went wrong', error.message || 'Please try again.');
      } finally {
        setIsFollowLoading(false);
      }
    },
    [
      albumId,
      followEntityId,
      isFollowLoading,
      isAuthenticated,
      confirmSignIn,
      navigateToSignIn,
      isFollowing,
      confirmEnableNotifications,
      requireFollowAccess,
      user,
      router,
    ],
  );

  useEffect(() => {
    if (!shouldAutoFollow) return;
    if (!isAuthenticated) return;
    if (isFollowStateHydrating) return;
    if (!albumId || String(albumId) === '0') return;

    if (isFollowing) {
      if (!autoFollowHandledRef.current) {
        autoFollowHandledRef.current = true;
        router.replace(`/quran-reciter/${albumId}`);
      }
      return;
    }
    if (autoFollowHandledRef.current) return;

    autoFollowHandledRef.current = true;
    handleFollowPress({ skipAuthCheck: true, forceFollow: true }).finally(() => {
      router.replace(`/quran-reciter/${albumId}`);
    });
  }, [
    shouldAutoFollow,
    isAuthenticated,
    isFollowStateHydrating,
    albumId,
    isFollowing,
    handleFollowPress,
    router,
  ]);

  // Convert QuranRecitation to Episode for player
  const recitationToEpisode = useCallback((recitation: QuranRecitation, album: QuranAlbum): Episode => {
    return {
      id: String(recitation.id),
      title: recitation.title,
      durationSec: durationToSeconds(recitation.duration),
      audioUrl: recitation.audioUrl,
      coverUrl: album.alb_thumbnail || album.img,
      seriesId: album.id,
      plays: recitation.plays || 0,
      liked: false,
      language: album.language || 'Arabic',
      downloads: 0,
      createdAt: album.post_date,
      lecturerName: album.name,
      reciter_name: album.name,
      isReciter: true,
    };
  }, []);

  const playableRecitations = useMemo(
    () => recitations.filter((recitation) => Boolean(recitation.audioUrl)),
    [recitations],
  );
  const playableIds = useMemo(
    () => playableRecitations.map((recitation) => String(recitation.id)),
    [playableRecitations],
  );
  const { resume } = useSeriesResume(playableIds);
  const resumeTitle = resume ? playableRecitations[resume.index]?.title : undefined;

  const visibleRecitations = useMemo(() => {
    const query = surahQuery.trim().toLowerCase();
    if (!query) return recitations;
    return recitations.filter((recitation, index) => {
      const number = recitation.surahNumber ?? recitation.trackNumber ?? index + 1;
      return String(number) === query || recitation.title.toLowerCase().includes(query);
    });
  }, [recitations, surahQuery]);

  const handlePlayAll = useCallback(async () => {
    if (!album || recitations.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      addSentryBreadcrumb('Play all Quran recitations', 'user', {
        albumId,
        reciterName: album.name,
        recitationCount: recitations.length,
      });

      // Convert all recitations to episodes
      const episodes = recitations
        .map((recitation) => recitationToEpisode(recitation, album))
        .filter((episode) => Boolean(episode.audioUrl));

      if (episodes.length === 0) {
        Alert.alert('Unavailable', 'No playable recitations were found for this reciter.');
        return;
      }

      // Play queue from start
      await playQueue(episodes, resume?.index ?? 0, false, { startAt: resume?.positionSec ?? 0 });
    } catch (err: any) {
      console.error('Play all error:', err);
      captureSentryException(err, {
        component: 'QuranReciterScreen',
        action: 'handlePlayAll',
        albumId,
        level: 'error',
      });
    }
  }, [album, recitations, albumId, playQueue, recitationToEpisode, resume]);

  const handleShuffle = useCallback(async () => {
    if (!album || recitations.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      addSentryBreadcrumb('Shuffle Quran recitations', 'user', {
        albumId,
        reciterName: album.name,
        recitationCount: recitations.length,
      });

      // Convert all recitations to episodes
      const episodes = recitations
        .map((recitation) => recitationToEpisode(recitation, album))
        .filter((episode) => Boolean(episode.audioUrl));

      if (episodes.length === 0) {
        Alert.alert('Unavailable', 'No playable recitations were found for this reciter.');
        return;
      }

      // Play queue shuffled
      await playQueue(episodes, 0, true);
    } catch (err: any) {
      console.error('Shuffle error:', err);
      captureSentryException(err, {
        component: 'QuranReciterScreen',
        action: 'handleShuffle',
        albumId,
        level: 'error',
      });
    }
  }, [album, recitations, albumId, playQueue, recitationToEpisode]);

  const handleRecitationPress = useCallback(
    async (recitation: QuranRecitation, index: number) => {
      if (!album) return;

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        addSentryBreadcrumb('Quran recitation pressed', 'user', {
          albumId,
          recitationId: recitation.id,
          recitationTitle: recitation.title,
          trackIndex: index,
        });

        const episodes = recitations
          .map((item) => recitationToEpisode(item, album))
          .filter((episode) => Boolean(episode.audioUrl));
        const selectedIndex = episodes.findIndex((episode) => episode.id === String(recitation.id));
        if (selectedIndex < 0) {
          Alert.alert('Unavailable', 'This recitation does not have a playable audio file.');
          return;
        }
        await playQueue(episodes, selectedIndex, false);
      } catch (err: any) {
        console.error('Recitation press error:', err);
        captureSentryException(err, {
          component: 'QuranReciterScreen',
          action: 'handleRecitationPress',
          albumId,
          recitationId: recitation.id,
          level: 'warning',
        });
      }
    },
    [albumId, album, recitations, recitationToEpisode, playQueue]
  );

  const handleShare = useCallback(async () => {
    if (!album) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      addSentryBreadcrumb('Share Quran reciter initiated', 'user', {
        albumId,
        reciterName: album.name,
        recitationCount: recitations.length,
      });

      const recitationCount = recitations.length;

      const webLink = linkingService.createQuranReciterLink(String(album.id));
      const baseMessage = `🕌 Quran Recitations\n\n` +
        `📖 ${album.name}\n\n` +
        `🎙️ ${recitationCount} ${recitationCount === 1 ? 'recitation' : 'recitations'}\n\n` +
        `Listen on dawahnigeria app\n\n` +
        `${webLink}`;
      const message = appendShareSignature(baseMessage);

      await Share.share({
        title: album.name,
        message,
        url: webLink,
      });

      addSentryBreadcrumb('Quran reciter shared successfully', 'user', {
        albumId,
        reciterName: album.name,
      });
    } catch (err: any) {
      // User cancelled share - this is normal, don't log as error
      if (err?.message !== 'User did not share') {
        console.error('Share error:', err);
        captureSentryException(err, {
          component: 'QuranReciterScreen',
          action: 'handleShare',
          albumId,
          level: 'warning',
        });
      }
    }
  }, [album, recitations, albumId]);

  const renderRecitationItem = useCallback(({ item, index }: { item: QuranRecitation; index: number }) => {
    const isCurrent = currentEpisode?.id === String(item.id);
    return (
      <LectureRow
        lecture={quranRecitationToRow(item, { position: recitations.indexOf(item) + 1, reciter: album?.name })}
        playback={isCurrent ? (isPlaying ? 'playing' : 'paused') : 'idle'}
        onPress={() => handleRecitationPress(item, index)}
      />
    );
  }, [album?.name, currentEpisode, isPlaying, handleRecitationPress, recitations]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <ScreenHeader onBack={handleBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text variant="body" color="secondaryLabel" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !album) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <ScreenHeader onBack={handleBack} />
        <View style={styles.centered}>
          <Icon name="alert-circle" size="xl" color="systemRed" />
          <Text variant="body" color="secondaryLabel" style={styles.errorText}>
            {error || 'Reciter not found'}
          </Text>
          <Button variant="tinted" onPress={fetchReciterData} style={styles.retryButton}>
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['bottom']}>
      <Stack.Screen options={{ title: album.name || 'Quran Reciter' }} />
      <ScreenHeader
        variant="overlay"
        onBack={handleBack}
        actions={[{ icon: 'share-outline', accessibilityLabel: 'Share reciter', onPress: handleShare }]}
      />

      <FlatList
        data={visibleRecitations}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderRecitationItem}
        ListEmptyComponent={
          <Text variant="body" color="secondaryLabel" align="center" style={styles.noSurah}>
            No surah matches “{surahQuery}”
          </Text>
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
          <LinearGradient
            colors={['#073B2A', '#0B5B3D', '#14855A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerContainer}
          >
            <Text style={styles.arabicMark}>القرآن الكريم</Text>
            <View style={styles.artworkContainer}>
              {album.alb_thumbnail || album.img ? (
                <Image 
                  source={{ uri: album.alb_thumbnail || album.img }}
                  style={styles.artwork}
                  accessibilityLabel={`Portrait of ${album.name}`}
                />
              ) : (
                <View style={[
                  styles.artwork,
                  styles.artworkPlaceholder,
                  {
                    backgroundColor: colors.system.fill.secondary,
                    borderColor: colors.system.separator.opaque
                  }
                ]}>
                  <Icon name="book" size="2xl" color="secondaryLabel" />
                </View>
              )}
            </View>

            <View style={styles.infoContainer}>
              <Text variant="title3" weight="bold" align="center" style={styles.title}>
                {album.name}
              </Text>
              <Text variant="subheadline" align="center" style={styles.heroSubtitle}>
                Quran recitation • {album.language || 'Arabic'}
              </Text>
              
              <View style={styles.statsContainer}>
                 <Text variant="caption1" weight="medium" style={styles.heroMeta}>
                    {recitations.length} {recitations.length === 1 ? 'Surah' : 'Surahs'}
                 </Text>
                 {album.views > 0 && (
                   <>
                     <Text variant="caption1" style={styles.heroMeta}> • </Text>
                     <Text variant="caption1" weight="medium" style={styles.heroMeta}>
                       {album.views.toLocaleString()} Views
                     </Text>
                   </>
                 )}
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <Button
                variant="filled"
                onPress={handlePlayAll}
                leftIcon={<Icon name="play" color={colors.brand.onPrimary} size="sm" />}
                style={styles.actionButton}
              >
                {resume ? 'Continue' : 'Play All'}
              </Button>
              <Button
                variant="tinted"
                onPress={handleShuffle}
                leftIcon={<Icon name="shuffle" color="brand" size="sm" />}
                style={styles.actionButton}
              >
                Shuffle
              </Button>
            </View>

            <View style={styles.followActionContainer}>
              <Button
                variant={isFollowing ? 'gray' : 'filled'}
                onPress={() => void handleFollowPress()}
                loading={isFollowLoading}
                disabled={followDisabled}
                leftIcon={
                  isFollowing ? (
                    <Icon name="checkmark" color="label" size="sm" />
                  ) : !canFollowMore ? (
                    <Icon name="lock-closed" color={colors.brand.onPrimary} size="sm" />
                  ) : undefined
                }
                style={styles.followButton}
                accessibilityLabel={isFollowing ? 'Following reciter' : 'Follow reciter'}
                accessibilityHint={
                  isFollowing ? 'Tap to unfollow this reciter' : 'Tap to follow this reciter'
                }
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </View>
            <View style={styles.queueHint}>
              <Icon name="list" size="sm" color="white" />
              <Text variant="caption1" style={styles.queueHintText}>
                {resumeTitle ? `Continue with ${resumeTitle}` : 'Tap any Surah to continue in Quran order'}
              </Text>
            </View>
          </LinearGradient>
          <View style={[styles.findSurah, { backgroundColor: colors.system.background.secondary }]}>
            <Icon name="search" size="sm" color="secondaryLabel" />
            <TextInput
              value={surahQuery}
              onChangeText={setSurahQuery}
              placeholder="Find a surah by name or number"
              placeholderTextColor={colors.system.label.tertiary}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Find a surah by name or number"
              style={[styles.findSurahInput, { color: colors.system.label.primary }]}
            />
          </View>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + designTokens.hitTargets.minimum + designTokens.spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  findSurah: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.lg,
    marginVertical: designTokens.spacing.md,
  },
  findSurahInput: {
    flex: 1,
    fontSize: designTokens.typography.fontSize.callout,
  },
  noSurah: {
    padding: designTokens.spacing['2xl'],
  },
  container: {
    flex: 1,
    // Background handled dynamically
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
    gap: designTokens.spacing.md,
  },
  loadingText: {
    marginTop: designTokens.spacing.sm,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: designTokens.spacing.md,
  },
  retryButton: {
    marginTop: designTokens.spacing.md,
  },
  listContent: {
    paddingBottom: designTokens.spacing['4xl'],
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xl,
    marginHorizontal: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius['2xl'],
    overflow: 'hidden',
  },
  arabicMark: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 18,
    marginBottom: designTokens.spacing.md,
  },
  artworkContainer: {
    marginBottom: designTokens.spacing.md,
    ...designTokens.shadows.xl,
  },
  artwork: {
    width: 120,
    height: 120,
    borderRadius: designTokens.borderRadius.xl,
  },
  artworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // Colors handled dynamically
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
    gap: designTokens.spacing.xs,
  },
  title: {
    marginBottom: 4,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginBottom: 4,
    color: 'rgba(255,255,255,0.78)',
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.72)',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  actionButton: {
    flex: 1,
  },
  followActionContainer: {
    marginTop: designTokens.spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  followButton: {
    width: '100%',
  },
  queueHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.lg,
  },
  queueHintText: {
    color: 'rgba(255,255,255,0.78)',
  },
});

export default QuranReciterScreen;
