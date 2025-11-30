import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/atoms';
import { Text } from '../../src/components/atoms/Text';
import { QuranAlbum, quranApi, QuranRecitation } from '../../src/services/api/quran.api';
import { addSentryBreadcrumb, captureSentryException } from '../../src/services/config/sentry.config';
import { usePlayerStore } from '../../src/stores';
import { designTokens } from '../../src/theme/designTokens';
import { Episode } from '../../src/types/types';
import { linkingService } from '../../src/services/linking.service';
import { appendShareSignature } from '../../src/utils/shareMessage';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

// Islamic Geometric Pattern Component
const IslamicPattern = ({ size = 80, opacity = 0.05 }) => (
  <Svg width={size} height={size} viewBox="0 0 80 80" style={{ position: 'absolute' }}>
    <Defs>
      <SvgLinearGradient id="pattern-grad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#10B981" stopOpacity={opacity} />
        <Stop offset="1" stopColor="#059669" stopOpacity={opacity * 1.5} />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M40,10 L50,30 L70,30 L55,45 L60,65 L40,50 L20,65 L25,45 L10,30 L30,30 Z"
      fill="url(#pattern-grad)"
    />
    <Path
      d="M40,20 L35,35 L20,35 L30,45 L25,60 L40,48 L55,60 L50,45 L60,35 L45,35 Z"
      fill="url(#pattern-grad)"
      opacity="0.5"
    />
  </Svg>
);

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

  const renderRecitationItem = ({ item, index }: { item: QuranRecitation; index: number }) => {
    const isPlaying = currentEpisode?.id === String(item.id);

    return (
      <TouchableOpacity
        style={[styles.recitationCard, isPlaying && styles.recitationCardPlaying]}
        onPress={() => handleRecitationPress(item, index)}
        activeOpacity={0.8}
      >
        {/* Ornate left border */}
        <View style={[styles.cardBorder, isPlaying && styles.cardBorderPlaying]} />

        {/* Surah number badge */}
        <View style={styles.surahBadge}>
          <LinearGradient
            colors={isPlaying ? ['#10B981', '#059669'] : ['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.1)']}
            style={styles.surahBadgeGradient}
          >
            {isPlaying ? (
              <Icon name="musical-notes" size="sm" color="label" />
            ) : (
              <Text
                variant="subheadline"
                weight="bold"
                style={styles.surahNumber}
              >
                {item.trackNumber || index + 1}
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text
            variant="body"
            weight="semibold"
            numberOfLines={2}
            color={isPlaying ? 'brand' : 'label'}
            style={styles.recitationTitle}
          >
            {item.title}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaBadge}>
              <Icon name="time-outline" size="sm" color="secondaryLabel" />
              <Text variant="caption1" color="secondaryLabel" weight="medium">
                {item.duration}
              </Text>
            </View>

            {item.plays > 0 && (
              <View style={styles.metaBadge}>
                <Icon name="headset-outline" size="sm" color="secondaryLabel" />
                <Text variant="caption1" color="secondaryLabel" weight="medium">
                  {item.plays.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Play indicator */}
        <View style={styles.playIndicator}>
          <Icon
            name={isPlaying ? "pause-circle" : "play-circle"}
            size="md"
            color={isPlaying ? 'brand' : 'tertiaryLabel'}
          />
        </View>

        {/* Subtle background pattern */}
        <View style={styles.cardPattern}>
          <IslamicPattern size={60} opacity={0.02} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Quran Reciter' }} />
        <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
        <Text variant="body" style={styles.loadingText}>
          Loading recitations...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !album) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: album.name || 'Quran Reciter' }} />

      <FlatList
        data={recitations}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderRecitationItem}
        ListHeaderComponent={
          <View>
            {/* Elevated Header with Gradients */}
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.05)', 'transparent']}
              style={styles.headerGradient}
            >
              {/* Background Pattern */}
              <View style={styles.headerPattern}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.patternItem,
                      {
                        left: `${(i * 20)}%`,
                        top: i % 2 === 0 ? 20 : 80,
                      },
                    ]}
                  >
                    <IslamicPattern size={80} opacity={0.08} />
                  </View>
                ))}
              </View>

              {/* Reciter Info */}
              <View style={styles.reciterHeader}>
                {/* Ornate Image Frame */}
                <View style={styles.imageFrame}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.imageFrameGradient}
                  >
                    <View style={styles.imageInner}>
                      {album.alb_thumbnail || album.img ? (
                        <Image source={{ uri: album.alb_thumbnail || album.img }} style={styles.reciterImage} />
                      ) : (
                        <View style={[styles.reciterImage, styles.imagePlaceholder]}>
                          <Icon name="book" size="lg" color="brand" />
                        </View>
                      )}
                    </View>
                  </LinearGradient>

                  {/* Decorative Corners */}
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>

                {/* Reciter Name with Underline */}
                <View style={styles.nameContainer}>
                  <Text variant="title1" weight="bold" style={styles.reciterName}>
                    {album.name}
                  </Text>
                  <View style={styles.nameUnderline}>
                    <LinearGradient
                      colors={['transparent', '#10B981', '#059669', '#10B981', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.underlineGradient}
                    />
                  </View>
                </View>

                <Text variant="body" color="secondaryLabel" weight="medium" style={styles.reciterSubtitle}>
                  Quran Reciter
                </Text>

                {/* Meta Info Pills */}
                <View style={styles.metaPills}>
                  <View style={styles.metaPill}>
                    <LinearGradient
                      colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']}
                      style={styles.metaPillGradient}
                    >
                      <Icon name="musical-note" size="sm" color="brand" />
                      <Text variant="footnote" color="brand" weight="semibold">
                        {album.lec_no} {album.lec_no === 1 ? 'Recitation' : 'Recitations'}
                      </Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.metaPill}>
                    <LinearGradient
                      colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']}
                      style={styles.metaPillGradient}
                    >
                      <Icon name="globe-outline" size="sm" color="brand" />
                      <Text variant="footnote" color="brand" weight="semibold">
                        {album.language}
                      </Text>
                    </LinearGradient>
                  </View>

                  {album.views > 0 && (
                    <View style={styles.metaPill}>
                      <LinearGradient
                        colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']}
                        style={styles.metaPillGradient}
                      >
                        <Icon name="headset" size="sm" color="brand" />
                        <Text variant="footnote" color="brand" weight="semibold">
                          {album.views.toLocaleString()}
                        </Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>

                {/* Holy Quran Badge */}
                <View style={styles.holyQuranBadge}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.quranBadgeGradient}
                  >
                    <Icon name="book" size="sm" color="label" />
                    <Text variant="footnote" color="label" weight="bold">
                      القرآن الكريم • Holy Quran
                    </Text>
                  </LinearGradient>
                </View>
              </View>
            </LinearGradient>

            {/* Premium Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.playAllButton}
                onPress={handlePlayAll}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playAllGradient}
                >
                  <Icon name="play" size="md" color="label" />
                  <Text variant="body" weight="bold" color="label">
                    Play All
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shuffleButton}
                onPress={handleShuffle}
                activeOpacity={0.85}
              >
                <View style={styles.shuffleContent}>
                  <Icon name="shuffle" size="sm" color="brand" />
                  <Text variant="body" weight="semibold" color="brand">
                    Shuffle
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View>
                <Text variant="title3" weight="bold" color="label">
                  Recitations
                </Text>
                <Text variant="caption1" color="secondaryLabel" weight="medium">
                  {recitations.length} {recitations.length === 1 ? 'surah' : 'surahs'} available
                </Text>
              </View>
              <View style={styles.ornament}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.ornamentGradient}
                />
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Buttons */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)']}
          style={styles.floatingButtonGradient}
        >
          <Icon name="chevron-back" size="lg" color="label" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleShare}
        style={styles.shareButton}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)']}
          style={styles.floatingButtonGradient}
        >
          <Icon name="share-social" size="md" color="label" />
        </LinearGradient>
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
    paddingBottom: designTokens.spacing['4xl'] + 40,
  },

  // Header Styles
  headerGradient: {
    paddingBottom: designTokens.spacing.xl,
  },
  headerPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  patternItem: {
    position: 'absolute',
  },
  reciterHeader: {
    alignItems: 'center',
    paddingTop: designTokens.spacing.xl + 20,
    paddingHorizontal: designTokens.spacing.lg,
  },

  // Ornate Image Frame
  imageFrame: {
    position: 'relative',
    padding: 4,
    marginBottom: designTokens.spacing.lg,
  },
  imageFrameGradient: {
    borderRadius: 24,
    padding: 3,
  },
  imageInner: {
    backgroundColor: designTokens.colors.system.background.primary,
    borderRadius: 21,
    padding: 4,
  },
  reciterImage: {
    width: 180,
    height: 180,
    borderRadius: 18,
  },
  imagePlaceholder: {
    backgroundColor: designTokens.colors.system.fill.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#10B981',
    borderWidth: 2,
  },
  cornerTopLeft: {
    top: -4,
    left: -4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: -4,
    right: -4,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: -4,
    left: -4,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: -4,
    right: -4,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },

  // Name Section
  nameContainer: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  reciterName: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  nameUnderline: {
    width: 120,
    height: 3,
    marginTop: designTokens.spacing.xs,
    borderRadius: 2,
    overflow: 'hidden',
  },
  underlineGradient: {
    flex: 1,
  },
  reciterSubtitle: {
    marginBottom: designTokens.spacing.lg,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },

  // Meta Pills
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.md,
  },
  metaPill: {
    borderRadius: designTokens.borderRadius.full,
    overflow: 'hidden',
  },
  metaPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: designTokens.borderRadius.full,
  },

  // Holy Quran Badge
  holyQuranBadge: {
    marginTop: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.full,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quranBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.xl,
  },
  playAllButton: {
    flex: 1,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md + 2,
  },
  shuffleButton: {
    flex: 1,
    borderRadius: designTokens.borderRadius.lg,
    backgroundColor: designTokens.colors.system.fill.secondary,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  shuffleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
  },
  ornament: {
    width: 40,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  ornamentGradient: {
    flex: 1,
  },

  // Recitation Card Styles
  recitationCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md + 2,
    paddingHorizontal: designTokens.spacing.md,
    paddingLeft: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.system.background.secondary,
    borderRadius: designTokens.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  recitationCardPlaying: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  cardBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderTopLeftRadius: designTokens.borderRadius.lg,
    borderBottomLeftRadius: designTokens.borderRadius.lg,
  },
  cardBorderPlaying: {
    backgroundColor: '#10B981',
  },
  surahBadge: {
    marginRight: designTokens.spacing.md,
    marginLeft: designTokens.spacing.sm,
  },
  surahBadgeGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  surahNumber: {
    color: '#10B981',
  },
  cardContent: {
    flex: 1,
    marginRight: designTokens.spacing.sm,
  },
  recitationTitle: {
    marginBottom: designTokens.spacing.xs,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playIndicator: {
    marginLeft: designTokens.spacing.xs,
  },
  cardPattern: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.5,
  },

  // Floating Buttons
  backButton: {
    position: 'absolute',
    top: designTokens.spacing['4xl'],
    left: designTokens.spacing.lg,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shareButton: {
    position: 'absolute',
    top: designTokens.spacing['4xl'],
    right: designTokens.spacing.lg,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default QuranReciterScreen;
