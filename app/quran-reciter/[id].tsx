import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '../../src/components/atoms';
import { useTheme } from '../../src/hooks/useTheme';
import { QuranAlbum, quranApi, QuranRecitation } from '../../src/services/api/quran.api';
import { addSentryBreadcrumb, captureSentryException } from '../../src/services/config/sentry.config';
import { linkingService } from '../../src/services/linking.service';
import { usePlayerStore } from '../../src/stores';
import { designTokens } from '../../src/theme/designTokens';
import { Episode } from '../../src/types/types';
import { appendShareSignature } from '../../src/utils/shareMessage';

const QuranReciterScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const { playQueue, currentEpisode } = usePlayerStore();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Check navigation state once to avoid calling canGoBack inline in render
  const canGoBack = useMemo(() => {
    try {
      return navigation.canGoBack();
    } catch {
      return false;
    }
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (canGoBack) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [canGoBack, router]);
  const [album, setAlbum] = useState<QuranAlbum | null>(null);
  const [recitations, setRecitations] = useState<QuranRecitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReciterData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      addSentryBreadcrumb('Fetching Quran reciter data', 'http', {
        albumId,
      });

      const response = await quranApi.getQuranAlbumDetails(albumId);
      setAlbum(response.album);
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
  }, [albumId]);

  useEffect(() => {
    fetchReciterData();
  }, [fetchReciterData]);

  // Convert QuranRecitation to Episode for player
  const recitationToEpisode = useCallback((recitation: QuranRecitation, album: QuranAlbum): Episode => {
    return {
      id: String(recitation.id),
      title: recitation.title,
      durationSec: Number(recitation.duration) || 0,
      audioUrl: recitation.audioUrl,
      coverUrl: album.alb_thumbnail || album.img,
      seriesId: album.id,
      plays: recitation.plays || 0,
      liked: false,
      language: album.language || 'Arabic',
      downloads: 0,
      createdAt: album.post_date,
      lecturerName: album.name,
    };
  }, []);

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
      const episodes = recitations.map((recitation) => recitationToEpisode(recitation, album));

      // Play queue from start
      await playQueue(episodes, 0, false);
    } catch (err: any) {
      console.error('Play all error:', err);
      captureSentryException(err, {
        component: 'QuranReciterScreen',
        action: 'handlePlayAll',
        albumId,
        level: 'error',
      });
    }
  }, [album, recitations, albumId, playQueue, recitationToEpisode]);

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
      const episodes = recitations.map((recitation) => recitationToEpisode(recitation, album));

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
    (recitation: QuranRecitation, index: number) => {
      if (!album) return;

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        addSentryBreadcrumb('Quran recitation pressed', 'user', {
          albumId,
          recitationId: recitation.id,
          recitationTitle: recitation.title,
          trackIndex: index,
        });

        // Navigate to recitation detail page instead of auto-playing
        router.push(`/lecture/${recitation.id}`);
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
    [albumId, album, router]
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
        `Listen on Dawah Nigeria app\n\n` +
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
    const isPlaying = currentEpisode?.id === String(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.recitationItem,
          { borderBottomColor: colors.system.separator.primary },
          isPlaying && { backgroundColor: colors.system.fill.quaternary }
        ]}
        onPress={() => handleRecitationPress(item, index)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title}`}
        accessibilityHint="Tap to view details"
      >
        <View style={styles.trackNumberContainer}>
          {isPlaying ? (
            <Icon name="musical-notes" size="sm" color="brand" />
          ) : (
            <Text
              variant="subheadline"
              color="secondaryLabel"
              weight="regular"
              style={styles.trackNumber}
            >
              {item.trackNumber || index + 1}
            </Text>
          )}
        </View>

        <View style={styles.recitationContent}>
          <Text
            variant="body"
            weight={isPlaying ? "semibold" : "regular"}
            color={isPlaying ? "brand" : "label"}
            numberOfLines={1}
            style={styles.recitationTitle}
          >
            {item.title}
          </Text>
          <View style={styles.recitationMeta}>
            <Text variant="caption1" color="secondaryLabel">
              {item.duration}
            </Text>
            {(item.plays || 0) > 0 && (
              <>
                <Text variant="caption1" color="secondaryLabel"> • </Text>
                <Text variant="caption1" color="secondaryLabel">
                  {(item.plays || 0).toLocaleString()} plays
                </Text>
              </>
            )}
          </View>
        </View>

        <Icon name="ellipsis-horizontal" size="sm" color="tertiaryLabel" />
      </TouchableOpacity>
    );
  }, [currentEpisode, handleRecitationPress, colors]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <View style={styles.customHeader}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.headerButton, { backgroundColor: colors.system.background.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-back" size="lg" color="label" />
          </TouchableOpacity>
          <View style={styles.headerButton} />
        </View>
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <View style={styles.customHeader}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.headerButton, { backgroundColor: colors.system.background.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-back" size="lg" color="label" />
          </TouchableOpacity>
          <View style={styles.headerButton} />
        </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: album.name || 'Quran Reciter' }} />
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.headerButton,
            {
              backgroundColor: colors.system.background.primary,
              shadowColor: colors.system.label.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            }
          ]}
          accessibilityRole="button"
          accessibilityLabel={canGoBack ? "Go back" : "Go home"}
        >
          <Icon
            name={canGoBack ? "chevron-back" : "home"}
            size="lg"
            color="label"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={[
            styles.headerButton,
            {
              backgroundColor: colors.system.background.primary,
              shadowColor: colors.system.label.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            }
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share reciter"
        >
          <Icon name="share-outline" size="lg" color="brand" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recitations}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderRecitationItem}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={[styles.artworkContainer, { shadowColor: colors.system.label.primary }]}>
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
              <Text variant="title2" weight="bold" align="center" style={styles.title}>
                {album.name}
              </Text>
              <Text variant="subheadline" color="secondaryLabel" align="center" style={styles.subtitle}>
                Quran Recitation • {album.language}
              </Text>
              
              <View style={styles.statsContainer}>
                 <Text variant="caption1" color="secondaryLabel" weight="medium">
                    {recitations.length} {recitations.length === 1 ? 'Surah' : 'Surahs'}
                 </Text>
                 {album.views > 0 && (
                   <>
                     <Text variant="caption1" color="secondaryLabel"> • </Text>
                     <Text variant="caption1" color="secondaryLabel" weight="medium">
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
                leftIcon={<Icon name="play" color="white" size="sm" />}
                style={styles.actionButton}
              >
                Play All
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
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  headerButton: {
    width: designTokens.hitTargets.minimum,
    height: designTokens.hitTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.full,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xl,
  },
  artworkContainer: {
    marginBottom: designTokens.spacing.lg,
    ...designTokens.shadows.xl,
    // Shadow color handled dynamically
  },
  artwork: {
    width: 200,
    height: 200,
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
    marginBottom: designTokens.spacing.xl,
    gap: designTokens.spacing.xs,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 4,
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
  recitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Border color handled dynamically
  },
  recitationItemPlaying: {
    // Bg color handled dynamically
  },
  trackNumberContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  trackNumber: {
    opacity: 0.7,
  },
  recitationContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: designTokens.spacing.md,
  },
  recitationTitle: {
    marginBottom: 2,
  },
  recitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default QuranReciterScreen;
