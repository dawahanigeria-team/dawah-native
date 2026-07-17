import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/atoms';
import { Text } from '../../src/components/atoms/Text';
import { useTheme } from '../../src/hooks/useTheme';
import {
  Album,
  albumsApi,
  AlbumTrack,
  parseAlbumTrackDuration,
} from '../../src/services/api/albums.api';
import {
  addSentryBreadcrumb,
  captureSentryException,
} from '../../src/services/config/sentry.config';
import { linkingService } from '../../src/services/linking.service';
import { usePlayerStore } from '../../src/stores';
import { designTokens } from '../../src/theme/designTokens';
import { Episode } from '../../src/types/types';
import { appendShareSignature } from '../../src/utils/shareMessage';

const formatCollectionDuration = (seconds: number): string => {
  if (seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours} hr${hours === 1 ? '' : 's'} ${minutes > 0 ? `${minutes} min` : ''}`.trim();
  return `${Math.max(1, minutes)} min`;
};

const formatTrackDuration = (duration: string | number | undefined): string => {
  const seconds = parseAlbumTrackDuration(duration);
  if (seconds <= 0) return 'Duration updating';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
};

const AlbumDetailScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const { playQueue, currentEpisode } = usePlayerStore();

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbumData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      addSentryBreadcrumb('Fetching album data', 'http', { albumId });
      const response = await albumsApi.getAlbumDetails(albumId);
      setAlbum(response.album);
      setTracks(response.tracks);
    } catch (err: unknown) {
      setError('Failed to load album. Please try again.');
      captureSentryException(err instanceof Error ? err : new Error(String(err)), {
        component: 'AlbumDetailScreen',
        action: 'fetchAlbumData',
        albumId,
        level: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchAlbumData();
  }, [fetchAlbumData]);

  const handleBack = useCallback(() => {
    try {
      if (navigation.canGoBack()) return router.back();
    } catch {
      // Fall through to the home route.
    }
    router.replace('/');
  }, [navigation, router]);

  const trackToEpisode = useCallback((track: AlbumTrack, currentAlbum: Album): Episode => ({
    id: String(track.id),
    title: track.title,
    audioUrl: track.audioUrl,
    durationSec: parseAlbumTrackDuration(track.duration),
    coverUrl: currentAlbum.coverUrl || '',
    lecturerName: currentAlbum.lecturerName || 'Unknown Scholar',
    plays: track.plays || 0,
    liked: false,
    seriesId: String(currentAlbum.id || ''),
    language: currentAlbum.language || 'Unknown',
    downloads: 0,
    createdAt: currentAlbum.createdAt || new Date().toISOString(),
  }), []);

  const episodes = useMemo(
    () => album ? tracks.map((track) => trackToEpisode(track, album)) : [],
    [album, tracks, trackToEpisode],
  );
  const totalKnownDuration = useMemo(
    () => episodes.reduce((total, episode) => total + episode.durationSec, 0),
    [episodes],
  );
  const durationLabel = album?.totalDuration || formatCollectionDuration(totalKnownDuration);

  const startQueue = useCallback(async (startIndex: number, shuffle: boolean) => {
    if (!album || episodes.length === 0) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      addSentryBreadcrumb(shuffle ? 'Shuffle album' : 'Play album in order', 'user', {
        albumId,
        albumTitle: album.title,
        lectureCount: episodes.length,
        startIndex,
      });
      await playQueue(episodes, startIndex, shuffle);
    } catch (err: unknown) {
      captureSentryException(err instanceof Error ? err : new Error(String(err)), {
        component: 'AlbumDetailScreen',
        action: shuffle ? 'handleShuffle' : 'handlePlayAll',
        albumId,
        level: 'error',
      });
    }
  }, [album, albumId, episodes, playQueue]);

  const handleLecturerPress = useCallback(() => {
    if (album?.lecturerId) router.push(`/lecturer/${album.lecturerId}`);
  }, [album, router]);

  const handleShare = useCallback(async () => {
    if (!album) return;
    try {
      const webLink = linkingService.createAlbumLink(String(album.id));
      const lecturerInfo = album.lecturerName ? ` by ${album.lecturerName}` : '';
      const languageInfo = album.language ? ` (${album.language})` : '';
      const message = appendShareSignature(
        `🎧 Islamic Lectures Album${languageInfo}\n\n📖 ${album.title}${lecturerInfo}\n\n` +
        `🎤 ${tracks.length} ${tracks.length === 1 ? 'lecture' : 'lectures'}\n\n` +
        `Listen on dawahnigeria app\n\n${webLink}`,
      );
      await Share.share({ title: album.title, message, url: webLink });
    } catch (err: unknown) {
      captureSentryException(err instanceof Error ? err : new Error(String(err)), {
        component: 'AlbumDetailScreen',
        action: 'handleShare',
        albumId,
        level: 'warning',
      });
    }
  }, [album, albumId, tracks.length]);

  const renderTrackItem = useCallback(({ item, index }: { item: AlbumTrack; index: number }) => {
    const isPlaying = currentEpisode?.id === String(item.id);
    const itemDuration = formatTrackDuration(item.duration);
    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          { borderBottomColor: colors.system.separator.primary },
          isPlaying && { backgroundColor: `${colors.brand.primary}12` },
        ]}
        onPress={() => startQueue(index, false)}
        activeOpacity={0.76}
        accessibilityRole="button"
        accessibilityLabel={`Lecture ${index + 1}, ${item.title}, ${itemDuration}`}
      >
        <View style={styles.trackNumber}>
          {isPlaying ? (
            <Icon name="musical-notes" size="sm" color="brand" />
          ) : (
            <Text variant="subheadline" color="tertiaryLabel" weight="semibold">
              {index + 1}
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
          <Text variant="caption1" color="secondaryLabel" numberOfLines={1} style={styles.trackMeta}>
            {`Lecture ${index + 1} • ${itemDuration}`}
          </Text>
        </View>
        <View style={[styles.rowPlayButton, { backgroundColor: colors.system.fill.tertiary }]}>
          <Icon name={isPlaying ? 'musical-note' : 'play'} size="sm" color={isPlaying ? 'brand' : 'label'} />
        </View>
      </TouchableOpacity>
    );
  }, [colors, currentEpisode, startQueue]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.system.background.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text variant="body" color="secondaryLabel" style={styles.loadingText}>Loading album…</Text>
      </SafeAreaView>
    );
  }

  if (error || !album) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.system.background.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Icon name="alert-circle" size="lg" color="systemRed" />
        <Text variant="body" color="systemRed" style={styles.errorText}>{error || 'Album not found'}</Text>
        <TouchableOpacity onPress={() => fetchAlbumData()} style={[styles.retryButton, { backgroundColor: colors.system.fill.secondary }]}>
          <Text variant="body" weight="semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={tracks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTrackItem}
        refreshing={refreshing}
        onRefresh={() => fetchAlbumData(true)}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={[`${colors.brand.primary}55`, `${colors.brand.primary}12`, colors.system.background.primary]}
              style={[styles.hero, { paddingTop: insets.top + 62 }]}
            >
              {album.coverUrl ? (
                <Image
                  source={{ uri: album.coverUrl }}
                  style={styles.albumCover}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={180}
                />
              ) : (
                <View style={[styles.albumCover, styles.albumCoverPlaceholder, { backgroundColor: colors.system.fill.tertiary }]}>
                  <Icon name="musical-notes" size="lg" color="tertiaryLabel" />
                </View>
              )}
              <View style={styles.albumInfo}>
                <Text variant="caption1" color="secondaryLabel" weight="semibold" style={styles.eyebrow}>LECTURE ALBUM</Text>
                <Text variant="title1" weight="bold" style={styles.albumTitle}>{album.title}</Text>
                {album.lecturerName && (
                  <TouchableOpacity onPress={handleLecturerPress} activeOpacity={0.7}>
                    <Text variant="body" color="label" weight="semibold">{album.lecturerName}</Text>
                  </TouchableOpacity>
                )}
                <Text variant="caption1" color="secondaryLabel" style={styles.albumMeta}>
                  {[
                    album.language,
                    `${tracks.length} ${tracks.length === 1 ? 'lecture' : 'lectures'}`,
                    durationLabel,
                  ].filter(Boolean).join(' • ')}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.secondaryAction, { backgroundColor: colors.system.fill.secondary }]}
                onPress={() => startQueue(Math.floor(Math.random() * episodes.length), true)}
                accessibilityRole="button"
                accessibilityLabel="Shuffle this album"
              >
                <Icon name="shuffle" size="md" color="label" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.brand.primary }]}
                onPress={() => startQueue(0, false)}
                accessibilityRole="button"
                accessibilityLabel="Play all lectures in order"
              >
                <Icon name="play" size="md" color={colors.fixed.black} />
                <Text variant="body" weight="bold" style={{ color: colors.fixed.black }}>Play in order</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tracksHeader}>
              <View>
                <Text variant="title3" weight="bold">Lectures</Text>
                <Text variant="caption1" color="secondaryLabel" style={styles.orderLabel}>Oldest lesson first</Text>
              </View>
              <Text variant="caption1" color="secondaryLabel">{tracks.length} total</Text>
            </View>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
      />

      <TouchableOpacity
        onPress={handleBack}
        style={[styles.topButton, styles.backButton, { top: insets.top + 10, backgroundColor: colors.overlay.darkHeavy }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon name="arrow-back" size="md" color={colors.fixed.white} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleShare}
        style={[styles.topButton, styles.shareButton, { top: insets.top + 10, backgroundColor: colors.overlay.darkHeavy }]}
        accessibilityRole="button"
        accessibilityLabel="Share album"
      >
        <Icon name="share-social" size="sm" color={colors.fixed.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 14 },
  errorText: { marginTop: 14, textAlign: 'center' },
  retryButton: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14 },
  listContent: { paddingBottom: designTokens.spacing['4xl'] },
  hero: { paddingHorizontal: 20, paddingBottom: 22, alignItems: 'center' },
  albumCover: {
    width: 190,
    height: 190,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 12,
  },
  albumCoverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  albumInfo: { width: '100%', marginTop: 24 },
  eyebrow: { letterSpacing: 1.1, marginBottom: 7 },
  albumTitle: { lineHeight: 34, marginBottom: 8 },
  albumMeta: { marginTop: 8, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 12 },
  secondaryAction: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  playButton: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  tracksHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  orderLabel: { marginTop: 3 },
  trackItem: { flexDirection: 'row', alignItems: 'center', minHeight: 82, paddingVertical: 11, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  trackNumber: { width: 30, alignItems: 'center', marginRight: 10 },
  trackInfo: { flex: 1, minWidth: 0, marginRight: 12 },
  trackMeta: { marginTop: 5 },
  rowPlayButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  topButton: { position: 'absolute', zIndex: 10, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  backButton: { left: 16 },
  shareButton: { right: 16 },
});

export default AlbumDetailScreen;
