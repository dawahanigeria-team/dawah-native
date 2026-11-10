import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useCallback } from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, hitTargets, spacing, typography } from '../../theme/designTokens';
import { imageUrlForSlot } from '../../utils/imageUrl';
import { Text } from '../atoms/Text';
import {
  formatClock,
  LectureDownload,
  LecturePlayback,
  LectureRowModel,
  NOT_DOWNLOADED,
  spokenDuration,
} from './lectureRowModel';

const ARTWORK_SIZE = 56;
const POSITION_WIDTH = 32;
const MAX_FONT_SCALE = 2;
const TITLE_LINE = typography.fontSize.subheadline * typography.lineHeight.normal;
const META_LINE = typography.fontSize.footnote * typography.lineHeight.normal;
const TEXT_GAP = 2;

/** Every row on a device shares one height, so FlashList can recycle without remeasuring. */
export const lectureRowHeight = (fontScale: number): number => {
  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);
  const textBlock = Math.ceil((TITLE_LINE * 2 + META_LINE) * scale) + TEXT_GAP;
  return Math.max(ARTWORK_SIZE, textBlock) + spacing.sm * 2;
};

const downloadLabel = (download: LectureDownload): string | null => {
  switch (download.status) {
    case 'none':
      return null;
    case 'queued':
      return 'Download queued';
    case 'downloading':
      return `Downloading ${Math.round(download.progress * 100)}%`;
    case 'downloaded':
      return 'Downloaded';
  }
};

const DOWNLOAD_ICON: Record<LectureDownload['status'], keyof typeof Ionicons.glyphMap | null> = {
  none: null,
  queued: 'time-outline',
  downloading: 'arrow-down-circle-outline',
  downloaded: 'arrow-down-circle',
};

export const lectureRowAccessibilityLabel = (
  lecture: LectureRowModel,
  playback: LecturePlayback,
  download: LectureDownload,
): string =>
  [
    lecture.title,
    lecture.scholar,
    lecture.durationSec === null ? null : spokenDuration(lecture.durationSec),
    playback === 'playing' ? 'Now playing' : playback === 'paused' ? 'Paused' : null,
    downloadLabel(download),
  ]
    .filter(Boolean)
    .join(', ');

export interface LectureRowProps {
  lecture: LectureRowModel;
  playback?: LecturePlayback;
  download?: LectureDownload;
  onPress: () => void;
  onPlay?: () => void;
  onMore?: () => void;
  onLongPress?: () => void;
}

const LectureRowComponent: React.FC<LectureRowProps> = ({
  lecture,
  playback = 'idle',
  download = NOT_DOWNLOADED,
  onPress,
  onPlay,
  onMore,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const isCurrent = playback !== 'idle';
  const indicatorIcon = playback === 'paused' ? 'pause' : 'volume-high';
  const downloadIcon = DOWNLOAD_ICON[download.status];
  const secondary = [
    lecture.scholar,
    lecture.durationSec === null ? null : formatClock(lecture.durationSec),
    lecture.meta,
    download.status === 'downloading' ? `${Math.round(download.progress * 100)}%` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  // Children of an accessible row are unreachable to VoiceOver, so play/more are exposed as row actions too.
  const accessibilityActions = [
    ...(onPlay ? [{ name: 'play', label: 'Play' }] : []),
    ...(onMore ? [{ name: 'more', label: 'More options' }] : []),
    ...(onLongPress ? [{ name: 'longpress' }] : []),
  ];
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'play') onPlay?.();
      if (event.nativeEvent.actionName === 'more') onMore?.();
      if (event.nativeEvent.actionName === 'longpress') onLongPress?.();
    },
    [onPlay, onMore, onLongPress],
  );

  const { leading } = lecture;
  const position = leading.position;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={lectureRowAccessibilityLabel(lecture, playback, download)}
      accessibilityState={{ selected: isCurrent }}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      style={({ pressed }) => [
        styles.row,
        {
          height: lectureRowHeight(fontScale),
          borderBottomColor: colors.system.separator.primary,
          backgroundColor: pressed || isCurrent ? colors.system.fill.quaternary : 'transparent',
        },
      ]}
    >
      {position !== undefined && (
        <View style={styles.position}>
          {isCurrent && leading.kind === 'position' ? (
            <Ionicons name={indicatorIcon} size={18} color={colors.brand.primary} />
          ) : (
            <Text variant="subheadline" weight="semibold" color="tertiaryLabel" numberOfLines={1}>
              {position}
            </Text>
          )}
        </View>
      )}

      {leading.kind === 'artwork' && (
        <View style={[styles.artwork, { backgroundColor: colors.system.fill.secondary }]}>
          {leading.url ? (
            <Image
              source={{ uri: imageUrlForSlot(leading.url, 'row') }}
              style={styles.artworkImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={lecture.id}
              allowDownscaling
              accessible={false}
            />
          ) : (
            <Ionicons name="headset-outline" size={22} color={colors.system.label.tertiary} />
          )}
          {isCurrent && (
            <View style={[styles.artworkOverlay, { backgroundColor: colors.overlay.darkMedium }]}>
              <Ionicons name={indicatorIcon} size={22} color={colors.fixed.white} />
            </View>
          )}
        </View>
      )}

      <View style={styles.body}>
        <Text
          variant="subheadline"
          weight="semibold"
          color={isCurrent ? 'brand' : 'label'}
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {lecture.title}
        </Text>
        <View style={styles.metaLine}>
          {downloadIcon && (
            <Ionicons
              name={downloadIcon}
              size={typography.fontSize.footnote}
              color={download.status === 'downloaded' ? colors.brand.primary : colors.system.label.secondary}
              style={styles.metaIcon}
            />
          )}
          <Text
            variant="footnote"
            color="secondaryLabel"
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.metaText}
          >
            {secondary}
          </Text>
        </View>
      </View>

      {onPlay && (
        <Pressable
          onPress={onPlay}
          style={styles.trailingButton}
          accessibilityRole="button"
          accessibilityLabel={`Play ${lecture.title}`}
        >
          <Ionicons
            name={playback === 'playing' ? 'pause-circle' : 'play-circle'}
            size={30}
            color={colors.brand.primary}
          />
        </Pressable>
      )}
      {onMore && (
        <Pressable
          onPress={onMore}
          style={styles.trailingButton}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${lecture.title}`}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.system.label.secondary} />
        </Pressable>
      )}
    </Pressable>
  );
};

export const LectureRow = memo(LectureRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  position: {
    width: POSITION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
  },
  artworkOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: TEXT_GAP,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: spacing.xs,
  },
  metaText: {
    flexShrink: 1,
  },
  trailingButton: {
    width: hitTargets.minimum,
    height: hitTargets.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
