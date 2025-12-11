import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../src/components/atoms/Text';
import { Icon } from '../../src/components/atoms';
import { albumsApi, Album, AlbumTrack } from '../../src/services/api/albums.api';
import { designTokens } from '../../src/theme/designTokens';
import { addSentryBreadcrumb, captureSentryException } from '../../src/services/config/sentry.config';
import { linkingService } from '../../src/services/linking.service';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '../../src/stores';
import { Episode } from '../../src/types/types';
import { appendShareSignature } from '../../src/utils/shareMessage';

const AlbumDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const { playQueue, currentEpisode } = usePlayerStore();

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbumData();
  }, [albumId]);

  // Convert AlbumTrack to Episode for player
  const trackToEpisode = useCallback((track: AlbumTrack, album: Album): Episode => {
    return {
      id: String(track.id),
      title: track.title,
      audioUrl: track.audioUrl,
      duration: track.duration,
      coverUrl: album.coverUrl || '',
      lecturerName: album.lecturerName || 'Unknown',
      plays: track.plays || 0,
      liked: false,
    };
  }, []);

  const fetchAlbumData = async () => {
    try {
      setLoading(true);
      setError(null);

      addSentryBreadcrumb('Fetching album data', 'http', {
        albumId,
      });

      const response = await albumsApi.getAlbumDetails(albumId);
      setAlbum(response.album);
      setTracks(response.tracks);

      addSentryBreadcrumb('Album data loaded', 'info', {
        albumId,
        albumTitle: response.album.title,
        trackCount: response.tracks.length,
      });
    } catch (err: any) {
      console.error('Failed to fetch album data:', err);
      setError('Failed to load album. Please try again.');

      captureSentryException(err, {
        component: 'AlbumDetailScreen',
        action: 'fetchAlbumData',
        albumId,
        level: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = useCallback(async () => {
    if (!album || tracks.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      addSentryBreadcrumb('Play all album lectures', 'user', {
        albumId,
        albumTitle: album.title,
        lectureCount: tracks.length,
      });

      // Convert all tracks to episodes
      const episodes = tracks.map((track) => trackToEpisode(track, album));

      // Play queue from start
      await playQueue(episodes, 0, false);
    } catch (err: any) {
      console.error('Play all error:', err);
      captureSentryException(err, {
        component: 'AlbumDetailScreen',
        action: 'handlePlayAll',
        albumId,
        level: 'error',
      });
    }
  }, [album, tracks, albumId, playQueue, trackToEpisode]);

  const handleShuffle = useCallback(async () => {
    if (!album || tracks.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      addSentryBreadcrumb('Shuffle album lectures', 'user', {
        albumId,
        albumTitle: album.title,
        lectureCount: tracks.length,
      });

      // Convert all tracks to episodes
      const episodes = tracks.map((track) => trackToEpisode(track, album));

      // Play queue shuffled
      await playQueue(episodes, 0, true);
    } catch (err: any) {
      console.error('Shuffle error:', err);
      captureSentryException(err, {
        component: 'AlbumDetailScreen',
        action: 'handleShuffle',
        albumId,
        level: 'error',
      });
    }
  }, [album, tracks, albumId, playQueue, trackToEpisode]);

  const handleTrackPress = useCallback(
    (track: AlbumTrack, index: number) => {
      if (!album) return;

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        addSentryBreadcrumb('Album track pressed', 'user', {
          albumId,
          trackId: track.id,
          trackTitle: track.title,
          trackIndex: index,
        });

        // Convert all tracks to episodes
        const episodes = tracks.map((t) => trackToEpisode(t, album));

        // Play queue starting from this track
        playQueue(episodes, index, false);
      } catch (err: any) {
        console.error('Track press error:', err);
        captureSentryException(err, {
          component: 'AlbumDetailScreen',
          action: 'handleTrackPress',
          albumId,
          trackId: track.id,
          level: 'warning',
        });
      }
    },
    [albumId, album, tracks, playQueue, trackToEpisode]
  );

  const handleLecturerPress = useCallback(() => {
    if (album?.lecturerId) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        addSentryBreadcrumb('Lecturer pressed from album', 'user', {
          albumId,
          lecturerId: album.lecturerId,
          lecturerName: album.lecturerName,
        });

        router.push(`/lecturer/${album.lecturerId}`);
      } catch (err: any) {
        console.error('Lecturer press error:', err);
        captureSentryException(err, {
          component: 'AlbumDetailScreen',
          action: 'handleLecturerPress',
          albumId,
          lecturerId: album.lecturerId,
          level: 'warning',
        });
      }
    }
  }, [album, albumId, router]);

  const handleShare = useCallback(async () => {
    if (!album) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      addSentryBreadcrumb('Share album initiated', 'user', {
        albumId,
        albumTitle: album.title,
        lecturerName: album.lecturerName,
        trackCount: tracks.length,
      });

      const lectureCount = tracks.length;
      const lecturerInfo = album.lecturerName ? ` by ${album.lecturerName}` : '';
      const languageInfo = album.language ? ` (${album.language})` : '';

      const webLink = linkingService.createAlbumLink(String(album.id));
      const baseMessage = `🎧 Islamic Lectures Album${languageInfo}\n\n` +
        `📖 ${album.title}${lecturerInfo}\n\n` +
        `🎤 ${lectureCount} ${lectureCount === 1 ? 'lecture' : 'lectures'}\n\n` +
        `Listen on Dawah Nigeria app\n\n` +
        `${webLink}`;
      const message = appendShareSignature(baseMessage);

      await Share.share({
        title: album.title,
        message,
        url: webLink,
      });

      addSentryBreadcrumb('Album shared successfully', 'user', {
        albumId,
        albumTitle: album.title,
      });
    } catch (err: any) {
      // User cancelled share - this is normal, don't log as error
      if (err?.message !== 'User did not share') {
        console.error('Share error:', err);
        captureSentryException(err, {
          component: 'AlbumDetailScreen',
          action: 'handleShare',
          albumId,
          level: 'warning',
        });
      }
    }
  }, [album, tracks, albumId]);

  const renderTrackItem = ({ item, index }: { item: AlbumTrack; index: number }) => {
    const isPlaying = currentEpisode?.id === String(item.id);

    return (
      <TouchableOpacity
        style={[styles.trackItem, isPlaying && styles.trackItemPlaying]}
        onPress={() => handleTrackPress(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.trackNumber}>
          {isPlaying ? (
            <Icon name="musical-notes" size="sm" color="tintColor" />
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
            color={isPlaying ? 'tintColor' : 'label'}
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
          <Icon name="play-circle" size="sm" color={isPlaying ? 'tintColor' : 'tertiaryLabel'} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Album' }} />
        <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
        <Text variant="body" style={styles.loadingText}>
          Loading album...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !album) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Album' }} />
        <Icon name="alert-circle" size="lg" color="systemRed" />
        <Text variant="body" color="systemRed" style={styles.errorText}>
          {error || 'Album not found'}
        </Text>
        <TouchableOpacity onPress={fetchAlbumData} style={styles.retryButton}>
          <Text variant="body" color="tintColor" weight="semibold">
            Try Again
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: album.title || 'Album' }} />

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrackItem}
        ListHeaderComponent={
          <View>
            {/* Album Cover & Info */}
            <View style={styles.albumHeader}>
              {album.coverUrl ? (
                <Image source={{ uri: album.coverUrl }} style={styles.albumCover} />
              ) : (
                <View style={[styles.albumCover, styles.albumCoverPlaceholder]}>
                  <Icon name="musical-notes" size="lg" color="tertiaryLabel" />
                </View>
              )}

              <Text variant="title2" weight="bold" style={styles.albumTitle}>
                {album.title}
              </Text>

              {album.lecturerName && (
                <TouchableOpacity onPress={handleLecturerPress} activeOpacity={0.7}>
                  <Text variant="body" color="tintColor" weight="medium">
                    {album.lecturerName}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.albumMeta}>
                {album.trackCount !== undefined && (
                  <View style={styles.metaItem}>
                    <Icon name="musical-note" size="sm" color="secondaryLabel" />
                    <Text variant="subheadline" color="secondaryLabel">
                      {album.trackCount} {album.trackCount === 1 ? 'lecture' : 'lectures'}
                    </Text>
                  </View>
                )}

                {album.totalDuration && (
                  <View style={styles.metaItem}>
                    <Icon name="time" size="sm" color="secondaryLabel" />
                    <Text variant="subheadline" color="secondaryLabel">
                      {album.totalDuration}
                    </Text>
                  </View>
                )}

                {album.plays !== undefined && (
                  <View style={styles.metaItem}>
                    <Icon name="play" size="sm" color="secondaryLabel" />
                    <Text variant="subheadline" color="secondaryLabel">
                      {album.plays.toLocaleString()} plays
                    </Text>
                  </View>
                )}
              </View>

              {album.language && (
                <View style={styles.languageTag}>
                  <Text variant="footnote" color="secondaryLabel" weight="medium">
                    {album.language}
                  </Text>
                </View>
              )}

              {album.description && (
                <Text variant="body" color="secondaryLabel" style={styles.description}>
                  {album.description}
                </Text>
              )}
            </View>

            {/* Play All and Shuffle Buttons */}
            <View style={styles.playButtonsContainer}>
              <TouchableOpacity
                style={styles.playAllButton}
                onPress={handlePlayAll}
                activeOpacity={0.7}
              >
                <Icon name="play-circle" size="md" color="systemBackground" />
                <Text variant="body" weight="semibold" color="systemBackground">
                  Play All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shuffleButton}
                onPress={handleShuffle}
                activeOpacity={0.7}
              >
                <Icon name="shuffle" size="sm" color="tintColor" />
                <Text variant="body" weight="semibold" color="tintColor">
                  Shuffle
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lectures Header */}
            <View style={styles.tracksHeader}>
              <Text variant="headline" weight="bold">
                Lectures
              </Text>
              <Text variant="subheadline" color="secondaryLabel">
                {tracks.length} {tracks.length === 1 ? 'lecture' : 'lectures'}
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
        <Icon name="arrow-back" size="lg" color="label" />
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        onPress={handleShare}
        style={styles.shareButton}
        activeOpacity={0.7}
      >
        <Icon name="share-social" size="md" color="label" />
      </TouchableOpacity>
    </SafeAreaView>
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
    marginTop: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    paddingHorizontal: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.system.fill.secondary,
    borderRadius: designTokens.borderRadius.sm,
  },
  description: {
    marginTop: designTokens.spacing.md,
    textAlign: 'center',
    lineHeight: 20,
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
    borderBottomColor: designTokens.colors.system.separator,
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
    top: designTokens.spacing.lg,
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
    top: designTokens.spacing.lg,
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

export default AlbumDetailScreen;
