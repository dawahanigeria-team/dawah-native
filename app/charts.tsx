import React, { memo, useEffect, useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '../src/components/atoms/Text';
import { Icon } from '../src/components/atoms';
import { ChartItem } from '../src/components/molecules/ChartItem';
import {
  fetchAlbumCharts,
  fetchLecturerCharts,
  fetchPlaylistCharts,
  fetchLectureCharts,
  ChartItem as ChartItemType,
  ChartPeriod,
} from '../src/services/api/charts.api';
import { designTokens } from '../src/theme/designTokens';
import { captureSentryException, addSentryBreadcrumb } from '../src/services/config/sentry.config';

type ChartType = 'album' | 'lecturer' | 'playlist' | 'lecture';

const ChartsScreen: React.FC = memo(() => {
  const [chartData, setChartData] = useState<ChartItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('weekly');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('album');

  const router = useRouter();

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
          console.log('📊 Navigating to lecture:', item.id);
          router.push(`/lecture/${item.id}`);
          break;

        case 'lecturer':
          console.log('📊 Navigating to lecturer:', item.rp_id || item.id);
          router.push(`/lecturer/${item.rp_id || item.id}`);
          break;

        case 'album':
          console.log('📊 Navigating to album:', item.id);
          router.push(`/album/${item.id}`);
          break;

        case 'playlist':
          // TODO: Implement playlist detail page navigation
          console.log('📊 Playlist pressed:', item.id);
          Alert.alert(
            'Coming Soon',
            'Playlist detail page is coming soon!',
            [{ text: 'OK' }]
          );
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
  }, [selectedChartType, selectedPeriod, router]);

  const getTitle = () => {
    const chartTypeTitle = selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1);
    const periodTitle = selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
    return `${periodTitle} ${chartTypeTitle} Charts`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
        <Text variant="body" style={styles.loadingText}>Loading Charts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="systemRed">{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: getTitle() }} />
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size="lg" color="label" />
      </TouchableOpacity>
      <View style={styles.segmentedControlContainer}>
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
      <View style={styles.segmentedControlContainer}>
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
      <FlatList
        data={chartData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <ChartItem
            item={item}
            index={index}
            selectedPeriod={selectedPeriod}
            selectedChartType={selectedChartType}
            onPress={() => handleChartItemPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
});

interface SegmentedControlOptionProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const SegmentedControlOption: React.FC<SegmentedControlOptionProps> = memo(({ label, isSelected, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.segmentedControlOption,
        isSelected && styles.segmentedControlOptionSelected,
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
    backgroundColor: designTokens.colors.system.background.primary,
    paddingTop: designTokens.spacing['4xl'],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.system.background.primary,
  },
  loadingText: {
    marginTop: designTokens.spacing.md,
  },
  listContent: {
    paddingBottom: designTokens.spacing.lg,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: designTokens.colors.system.fill.secondary,
    borderRadius: designTokens.borderRadius.lg,
    marginHorizontal: designTokens.spacing.lg,
    marginVertical: designTokens.spacing.md,
    padding: designTokens.spacing.xs,
  },
  segmentedControlOption: {
    flex: 1,
    paddingVertical: designTokens.spacing.sm,
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.md,
  },
  segmentedControlOptionSelected: {
    backgroundColor: designTokens.colors.system.background.primary,
    borderBottomWidth: 2,
    borderBottomColor: designTokens.colors.brand.primary,
  },
  backButton: {
    position: 'absolute',
    top: designTokens.spacing.lg,
    left: designTokens.spacing.lg,
    zIndex: 1,
    padding: designTokens.spacing.sm,
  },
});

ChartsScreen.displayName = 'ChartsScreen';

export default ChartsScreen;
