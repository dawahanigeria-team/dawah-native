import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Icon } from '../../src/components/atoms';
import { Text } from '../../src/components/atoms/Text';
import { QuranAlbum, quranApi, QuranRecitation } from '../../src/services/api/quran.api';
import { addSentryBreadcrumb, captureSentryException } from '../../src/services/config/sentry.config';
import { usePlayerStore } from '../../src/stores';
import { designTokens } from '../../src/theme/designTokens';
import { Episode } from '../../src/types/types';

const QuranReciterScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const { playQueue, currentEpisode } = usePlayerStore();

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

      const message = `🕌 Quran Recitations\n\n` +
        `📖 ${album.name}\n\n` +
        `🎙️ ${recitationCount} ${recitationCount === 1 ? 'recitation' : 'recitations'}\n\n` +
        `Listen on Dawah Nigeria app`;

      await Share.share({
        title: album.name,
        message,
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

  const renderRecitationItem = ({ item, index }: { item: QuranRecitation; index: number }) => {
    const isPlaying = currentEpisode?.id === String(item.id);

    return (
      <TouchableOpacity
        style={[styles.trackItem, isPlaying && styles.trackItemPlaying]}
        onPress={() => handleRecitationPress(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.trackNumber}>
          {isPlaying ? (
            <Icon name="musical-notes" size="sm" color="brand" />
          ) : (
            <Text variant="subheadline" color="secondaryLabel" weight="medium">
              {item.trackNumber || index + 1}
            </Text>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text
            variant="body"
            weight="semibold"
            numberOfLines={2}
            color={isPlaying ? 'brand' : 'label'}
          >
            {item.title}
          </Text>
          <Text variant="footnote" color="secondaryLabel">
            {item.duration}
          </Text>
        </View>

        <View style={styles.trackStats}>
          <Icon name="play" size="sm" color="tertiaryLabel" />
          <Text variant="caption2" color="tertiaryLabel">
            {item.plays?.toLocaleString() || '0'}
          </Text>
        </View>

        <View style={{ paddingTop: designTokens.spacing.xs }}>
          <Icon name="play-circle" size="sm" color={isPlaying ? 'brand' : 'tertiaryLabel'} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
        <Text variant="body" style={styles.loadingText}>
          Loading recitations...
        </Text>
      </View>
    );
  }

  if (error || !album) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <Icon name="alert-circle" size="lg" color="systemRed" />
        <Text variant="body" color="systemRed" style={styles.errorText}>
          {error || 'Reciter not found'}
        </Text>
        <TouchableOpacity onPress={fetchReciterData} style={styles.retryButton}>
          <Text variant="body" color="brand" weight="semibold">
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: album.name || 'Quran Reciter' }} />

      <FlatList
        data={recitations}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderRecitationItem}
        ListHeaderComponent={
          <View>
            {/* Reciter Cover & Info */}
            <View style={styles.albumHeader}>
              {album.alb_thumbnail || album.img ? (
                <Image source={{ uri: album.alb_thumbnail || album.img }} style={styles.albumCover} />
              ) : (
                <View style={[styles.albumCover, styles.albumCoverPlaceholder]}>
                  <Icon name="book" size="lg" color="tertiaryLabel" />
                </View>
              )}

              <Text variant="title2" weight="bold" style={styles.albumTitle}>
                {album.name}
              </Text>

              <Text variant="body" color="secondaryLabel" weight="medium">
                Quran Reciter
              </Text>

              <View style={styles.albumMeta}>
                <View style={styles.metaItem}>
                  <Icon name="musical-note" size="sm" color="secondaryLabel" />
                  <Text variant="subheadline" color="secondaryLabel">
                    {album.lec_no} {album.lec_no === 1 ? 'recitation' : 'recitations'}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Icon name="globe" size="sm" color="secondaryLabel" />
                  <Text variant="subheadline" color="secondaryLabel">
                    {album.language}
                  </Text>
                </View>

                {album.views > 0 && (
                  <View style={styles.metaItem}>
                    <Icon name="play" size="sm" color="secondaryLabel" />
                    <Text variant="subheadline" color="secondaryLabel">
                      {album.views.toLocaleString()} plays
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.languageTag}>
                <Icon name="book" size="sm" color="brand" />
                <Text variant="footnote" color="brand" weight="medium">
                  Holy Quran
                </Text>
              </View>
            </View>

            {/* Play All and Shuffle Buttons */}
            <View style={styles.playButtonsContainer}>
              <TouchableOpacity
                style={styles.playAllButton}
                onPress={handlePlayAll}
                activeOpacity={0.7}
              >
                <Icon name="play-circle" size="md" color="label" />
                <Text variant="body" weight="semibold" color="label">
                  Play All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shuffleButton}
                onPress={handleShuffle}
                activeOpacity={0.7}
              >
                <Icon name="shuffle" size="sm" color="brand" />
                <Text variant="body" weight="semibold" color="brand">
                  Shuffle
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recitations Header */}
            <View style={styles.tracksHeader}>
              <Text variant="headline" weight="bold">
                Recitations
              </Text>
              <Text variant="subheadline" color="secondaryLabel">
                {recitations.length} {recitations.length === 1 ? 'recitation' : 'recitations'}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Icon name="chevron-back" size="lg" color="label" />
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        onPress={handleShare}
        style={styles.shareButton}
        activeOpacity={0.7}
      >
        <Icon name="share-social" size="md" color="label" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.system.background.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.system.background.primary,
    padding: designTokens.spacing.xl,
  },
  loadingText: {
    marginTop: designTokens.spacing.md,
  },
  errorText: {
    marginTop: designTokens.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.system.fill.secondary,
    borderRadius: designTokens.borderRadius.md,
  },
  listContent: {
    paddingBottom: designTokens.spacing['4xl'],
  },
  albumHeader: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xl,
    paddingHorizontal: designTokens.spacing.lg,
  },
  albumCover: {
    width: 200,
    height: 200,
    borderRadius: designTokens.borderRadius.lg,
    marginBottom: designTokens.spacing.lg,
  },
  albumCoverPlaceholder: {
    backgroundColor: designTokens.colors.system.fill.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumTitle: {
    textAlign: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  albumMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  languageTag: {
    marginTop: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    backgroundColor: designTokens.colors.system.fill.secondary,
    borderRadius: designTokens.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  playButtonsContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.xl,
  },
  playAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.brand.primary,
    borderRadius: designTokens.borderRadius.lg,
  },
  shuffleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.system.fill.secondary,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.brand.primary,
  },
  tracksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.system.background.secondary,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.system.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: designTokens.colors.system.separator.primary,
    minHeight: 64,
  },
  trackItemPlaying: {
    backgroundColor: designTokens.colors.system.fill.tertiary,
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    paddingTop: designTokens.spacing.xs,
  },
  trackInfo: {
    flex: 1,
    marginRight: designTokens.spacing.md,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginRight: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.xs,
  },
  backButton: {
    position: 'absolute',
    top: designTokens.spacing['4xl'],
    left: designTokens.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designTokens.colors.system.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    position: 'absolute',
    top: designTokens.spacing['4xl'],
    right: designTokens.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designTokens.colors.system.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default QuranReciterScreen;
