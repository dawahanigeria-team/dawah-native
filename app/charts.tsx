import { Stack } from 'expo-router';
import { useGuardedPush } from '../src/navigation/useGuardedPush';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/components/atoms/Text';
import { FlashList } from '../src/components/adapters/flashListCompat';
import { ChartItem } from '../src/components/molecules/ChartItem';
import { ChartItemSkeleton } from '../src/components/molecules/ChartItem.skeleton';
import { LectureRow } from '../src/components/molecules/LectureRow';
import { chartLectureToRow } from '../src/components/molecules/lectureRowModel';
import { ScreenHeader } from '../src/components/molecules/ScreenHeader';
import {
  ChartItem as ChartItemType,
  ChartPeriod,
  fetchAlbumCharts,
  fetchLectureCharts,
  fetchLecturerCharts,
  fetchPlaylistCharts,
} from '../src/services/api/charts.api';
import { addSentryBreadcrumb, captureSentryException } from '../src/services/config/sentry.config';
import { logger } from '../src/utils/logger';
import { useTheme } from '../src/hooks/useTheme';
import { getTabBarPaddingBottom } from '../src/utils/layout';

type ChartType = 'album' | 'lecturer' | 'playlist' | 'lecture';

// Keep in sync with the MiniPlayer component height so list content isn't obscured.
const MINI_PLAYER_HEIGHT = 72;

const ChartsScreen: React.FC = memo(() => {
  const { colors, spacing, borderRadius } = useTheme();
  const [chartData, setChartData] = useState<ChartItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('weekly');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('album');

  const insets = useSafeAreaInsets();

  const listPaddingBottom = spacing.lg + MINI_PLAYER_HEIGHT + getTabBarPaddingBottom(insets.bottom);

  const getChartData = useCallback(async (chartType: ChartType, period: ChartPeriod) => {
    try {
      setLoading(true);
      setError(null);
      let responseData: ChartItemType[] = [];

      switch (chartType) {
        case 'album':
          responseData = await fetchAlbumCharts(period);
          break;
        case 'lecturer':
          responseData = await fetchLecturerCharts(period);
          break;
        case 'playlist':
          responseData = await fetchPlaylistCharts(period);
          break;
        case 'lecture':
          responseData = await fetchLectureCharts(period);
          break;
        default:
          break;
      }

      // Sort data based on the selected period
      const sortedData = responseData.sort((a, b) => {
        return (b.charts?.[period] || 0) - (a.charts?.[period] || 0);
      });
      setChartData(sortedData);
    } catch (err) {
      setError('An error occurred while fetching chart data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getChartData(selectedChartType, selectedPeriod);
  }, [selectedChartType, selectedPeriod, getChartData]);

  const guardedPush = useGuardedPush();

  const handleChartItemPress = useCallback((item: ChartItemType) => {
    try {
      // Track chart item navigation in Sentry
      addSentryBreadcrumb('Chart item pressed', 'user', {
        chartType: selectedChartType,
        itemId: item.id,
        itemName: item.mp3_title || item.name,
        period: selectedPeriod,
      });

      // Navigate based on chart type
      switch (selectedChartType) {
        case 'lecture':
          logger.debug('Navigating to lecture:', item.id);
          guardedPush(`/lecture/${item.id}`);
          break;

        case 'lecturer':
          logger.debug('Navigating to lecturer:', item.rp_id || item.id);
          guardedPush(`/lecturer/${item.rp_id || item.id}`);
          break;

        case 'album':
          logger.debug('Navigating to album:', item.id);
          guardedPush(`/album/${item.id}`);
          break;

        case 'playlist':
          logger.debug('Navigating to playlist:', item.id);
          guardedPush(`/playlist/${item.id}`);
          break;

        default:
          console.warn('Unknown chart type:', selectedChartType);
      }
    } catch (error: any) {
      console.error('Chart navigation error:', error);
      captureSentryException(error, {
        component: 'ChartsScreen',
        action: 'handleChartItemPress',
        chartType: selectedChartType,
        itemId: item.id,
      });
      Alert.alert('Error', 'Unable to navigate. Please try again.');
    }
  }, [selectedChartType, selectedPeriod, guardedPush]);

  const getTitle = () => {
    const chartTypeTitle = selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1);
    const periodTitle = selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
    return `${periodTitle} ${chartTypeTitle} Charts`;
  };

  const renderHeader = () => (
    <>
      <Stack.Screen options={{ title: getTitle() }} />
      <ScreenHeader title="Charts" />
    </>
  );

  const renderFilters = () => (
    <>
      <View style={[styles.segmentedControlContainer, { backgroundColor: colors.system.fill.secondary, borderRadius: borderRadius.lg, marginHorizontal: spacing.lg, marginVertical: spacing.md, padding: spacing.xs }]}>
        <SegmentedControlOption
          label="Album"
          isSelected={selectedChartType === 'album'}
          onPress={() => setSelectedChartType('album')}
        />
        <SegmentedControlOption
          label="Lecturer"
          isSelected={selectedChartType === 'lecturer'}
          onPress={() => setSelectedChartType('lecturer')}
        />
        <SegmentedControlOption
          label="Playlist"
          isSelected={selectedChartType === 'playlist'}
          onPress={() => setSelectedChartType('playlist')}
        />
        <SegmentedControlOption
          label="Lecture"
          isSelected={selectedChartType === 'lecture'}
          onPress={() => setSelectedChartType('lecture')}
        />
      </View>
      <View style={[styles.segmentedControlContainer, { backgroundColor: colors.system.fill.secondary, borderRadius: borderRadius.lg, marginHorizontal: spacing.lg, marginVertical: spacing.md, padding: spacing.xs }]}>
        <SegmentedControlOption
          label="Daily"
          isSelected={selectedPeriod === 'daily'}
          onPress={() => setSelectedPeriod('daily')}
        />
        <SegmentedControlOption
          label="Weekly"
          isSelected={selectedPeriod === 'weekly'}
          onPress={() => setSelectedPeriod('weekly')}
        />
        <SegmentedControlOption
          label="Monthly"
          isSelected={selectedPeriod === 'monthly'}
          onPress={() => setSelectedPeriod('monthly')}
        />
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['bottom']}>
        {renderHeader()}
        <View style={styles.content}>
          {renderFilters()}
          <FlashList
            data={Array.from({ length: 10 })}
            keyExtractor={(_, index) => `skeleton-${index}`}
            renderItem={() => <ChartItemSkeleton />}
            contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['bottom']}>
        {renderHeader()}
        <View style={styles.centered}>
          <Text variant="body" color="systemRed">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.system.background.primary }]} edges={['bottom']}>
      {renderHeader()}
      <View style={styles.content}>
        {renderFilters()}
        <FlashList
          data={chartData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) =>
            selectedChartType === 'lecture' ? (
              <LectureRow
                lecture={chartLectureToRow(item, { position: index + 1, period: selectedPeriod })}
                onPress={() => handleChartItemPress(item)}
              />
            ) : (
              <ChartItem
                item={item}
                index={index}
                selectedPeriod={selectedPeriod}
                selectedChartType={selectedChartType}
                onPress={() => handleChartItemPress(item)}
              />
            )
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
        />
      </View>
    </SafeAreaView>
  );
});

interface SegmentedControlOptionProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const SegmentedControlOption: React.FC<SegmentedControlOptionProps> = memo(({ label, isSelected, onPress }) => {
  const { colors, borderRadius, spacing } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.segmentedControlOption,
        { paddingVertical: spacing.sm, borderRadius: borderRadius.md },
        isSelected && [
          styles.segmentedControlOptionSelected,
          { 
            backgroundColor: colors.system.background.primary,
            borderBottomColor: colors.brand.primary 
          },
        ],
      ]}
      onPress={onPress}
    >
      <Text
        variant="subheadline"
        weight={isSelected ? 'semibold' : 'regular'}
        color={isSelected ? 'label' : 'secondaryLabel'}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

SegmentedControlOption.displayName = 'SegmentedControlOption';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    // padding handled inline
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  segmentedControlOption: {
    flex: 1,
    alignItems: 'center',
  },
  segmentedControlOptionSelected: {
    borderBottomWidth: 2,
  },
});

ChartsScreen.displayName = 'ChartsScreen';

export default ChartsScreen;
