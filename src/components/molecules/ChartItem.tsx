import React, { memo } from 'react';
import { View, ViewStyle, ImageStyle, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../../hooks/useTheme';
import { ChartItem as ChartItemType, ChartPeriod } from '../../services/api/charts.api';
import { Image } from 'expo-image';

interface ChartItemProps {
  item: ChartItemType;
  index: number;
  selectedPeriod: ChartPeriod;
  selectedChartType: 'album' | 'lecturer' | 'playlist' | 'lecture';
  onPress?: () => void;
}

export const ChartItem: React.FC<ChartItemProps> = memo(({ item, index, selectedPeriod, selectedChartType, onPress }) => {
  const { colors, spacing, borderRadius } = useTheme();

  const handlePress = () => {
    // Provide haptic feedback on tap
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.system.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.system.separator.primary,
  };

  const imageStyle: ImageStyle = {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily': return 'Daily Views';
      case 'weekly': return 'Weekly Views';
      case 'monthly': return 'Monthly Views';
      default: return 'Views';
    }
  };

  const getImageSource = () => {
    if (selectedChartType === 'lecturer') {
      return item.rp_thumbnail || item.img || 'https://via.placeholder.com/60';
    } else if (selectedChartType === 'album' || selectedChartType === 'playlist') {
      return item.alb_thumbnail || item.img || 'https://via.placeholder.com/60';
    } else if (selectedChartType === 'lecture') {
      return item.lec_thumbnail || item.img || 'https://via.placeholder.com/60';
    }
    return 'https://via.placeholder.com/60'; // Generic fallback
  };

  const getTitle = () => {
    if (selectedChartType === 'lecture') {
      return item.mp3_title || 'Untitled Lecture';
    }
    return item.name || 'Untitled Item';
  };

  const getSubtitle = () => {
    if (selectedChartType === 'album') {
      return item.categories || item.language || 'No details available';
    } else if (selectedChartType === 'lecture') {
      return item.categories || item.language || 'No details available';
    } else if (selectedChartType === 'lecturer') {
      return item.categories || item.language || 'Lecturer';
    } else if (selectedChartType === 'playlist') {
      return item.user_id ? `User ID: ${item.user_id}` : 'No details available';
    }
    return 'No details available';
  };

  const getChartValue = () => {
    return item.charts?.[selectedPeriod];
  };

  const imageSource = getImageSource();

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} disabled={!onPress}>
      <View style={containerStyle}>
        <Text variant="headline" weight="bold" style={{ marginRight: spacing.md }}>
          {index + 1}.
        </Text>
      {imageSource && <Image source={{ uri: imageSource }} style={imageStyle} contentFit="cover" />}
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text variant="body" weight="medium" numberOfLines={2}>
          {getTitle()}
        </Text>
        <Text variant="footnote" color="secondaryLabel">
          {getSubtitle()}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs }}>
          {item.views !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="eye" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.views || 0}</Text>
            </View>
          )}
          {item.downloads !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="download" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.downloads || 0}</Text>
            </View>
          )}
          {item.favorites !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="heart" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.favorites || 0}</Text>
            </View>
          )}
          {item.comment !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="chatbubble" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.comment || 0}</Text>
            </View>
          )}
          {item.share !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="share-social" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.share || 0}</Text>
            </View>
          )}
          {item.language && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="language" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.language || 'Unknown'}</Text>
            </View>
          )}
          {item.post_date && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <Icon name="calendar" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
              <Text variant="footnote" color="tertiaryLabel">{item.post_date || 'Unknown'}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="stats-chart" size="sm" color="tertiaryLabel" style={{ marginRight: spacing.xs }} />
          <Text variant="subheadline" weight="semibold">
            {getChartValue()}
          </Text>
        </View>
        <Text variant="footnote" color="tertiaryLabel" adjustsFontSizeToFit minimumFontScale={0.7}>
          {getPeriodLabel()}
        </Text>
      </View>
      {onPress && (
        <View style={{ marginLeft: spacing.sm }}>
          <Icon name="chevron-forward" size="sm" color="tertiaryLabel" />
        </View>
      )}
    </View>
    </TouchableOpacity>
  );
});

ChartItem.displayName = 'ChartItem';