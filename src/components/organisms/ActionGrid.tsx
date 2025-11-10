import React, { memo } from 'react';
import { View, ViewStyle, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { designTokens, BorderRadius } from '../../theme/designTokens';
import { Touchable, Text, Icon } from '../atoms';

interface ActionItem {
  id: string;
  title: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  color: string;
  description?: string;
}

interface ActionGridProps {
  items?: ActionItem[];
  columns?: number;
  itemSpacing?: keyof typeof designTokens.spacing;
  contentPadding?: keyof typeof designTokens.spacing;
  borderRadius?: BorderRadius;
  onItemPress?: (item: ActionItem) => void;
  style?: ViewStyle;
}

const defaultActions: ActionItem[] = [
  {
    id: '1',
    title: 'Chart',
    icon: 'trending-up',
    color: '#3B82F6', // blue-500
    description: 'View trending content'
  },
  {
    id: '2',
    title: 'Lecturers',
    icon: 'people',
    color: '#22C55E', // green-500
    description: 'Browse all lecturers'
  },
  {
    id: '3',
    title: 'Playlist',
    icon: 'list',
    color: '#F59E0B', // amber-500
    description: 'Your saved playlists'
  },
  {
    id: '4',
    title: 'Video',
    icon: 'videocam',
    color: '#EF4444', // red-500
    description: 'Watch video content'
  },
  {
    id: '5',
    title: 'Quran',
    icon: 'book',
    color: '#10B981', // emerald-500
    description: 'Quran recitations'
  },
  {
    id: '6',
    title: 'Trending',
    icon: 'flame',
    color: '#F97316', // orange-500
    description: 'Most popular content'
  },
];

export const ActionGrid: React.FC<ActionGridProps> = memo(({
  items = defaultActions,
  columns = 3,
  itemSpacing = 'md',
  contentPadding = 'lg',
  borderRadius = 'xl',
  onItemPress,
  style,
}) => {
  const router = useRouter();

  const handleItemPress = (item: ActionItem) => {
    if (item.id === '1' && item.title === 'Chart') {
      router.push('/charts');
    } else if (item.id === '2' && item.title === 'Lecturers') {
      router.push('/lecturers');
    } else if (item.id === '3' && item.title === 'Playlist') {
      router.push('/playlists');
    } else if (item.id === '5' && item.title === 'Quran') {
      router.push('/section/quran-recitations');
    } else if (item.id === '6' && item.title === 'Trending') {
      router.push('/section/trending');
    } else {
      onItemPress?.(item);
    }
  };

  const renderItem = ({ item, index }: { item: ActionItem; index: number }) => {
    const itemWidth = (
      100 - (columns - 1) * 2
    ) / columns;

    const itemStyle: ViewStyle = {
      width: `${itemWidth}%`,
      marginBottom: designTokens.spacing.sm,
    };

    const cardStyle: ViewStyle = {
      backgroundColor: designTokens.colors.system.background.secondary,
      borderRadius: designTokens.borderRadius[borderRadius],
      padding: designTokens.spacing.lg,
      alignItems: 'center',
      minHeight: designTokens.hitTargets.large + designTokens.spacing['2xl'],
      ...designTokens.shadows.sm,
    };

    const iconContainerStyle: ViewStyle = {
      width: 48,
      height: 48,
      borderRadius: designTokens.borderRadius.full,
      backgroundColor: `${item.color}20`, // 20% opacity
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.md,
    };

    return (
      <View style={itemStyle}>
        <Touchable
          style={cardStyle}
          onPress={() => handleItemPress(item)}
          accessibilityLabel={item.title}
          accessibilityHint={item.description || `Tap to open ${item.title.toLowerCase()}`}
          accessibilityRole="button"
        >
          <View style={iconContainerStyle}>
            <Icon 
              name={item.icon} 
              size="xl" 
              color={item.color}
              accessibilityLabel={`${item.title} icon`}
            />
          </View>
          
          <Text 
            variant="footnote" 
            color="label"
            weight="medium"
            align="center"
            numberOfLines={2}
            style={{
              lineHeight: designTokens.typography.fontSize.footnote * 1.2,
            }}
          >
            {item.title}
          </Text>
        </Touchable>
      </View>
    );
  };

  const containerStyle: ViewStyle = {
    paddingHorizontal: designTokens.spacing.lg,
    marginVertical: designTokens.spacing.md,
    ...style,
  };

  return (
    <View style={containerStyle}>
      <FlatList
        data={items}
        renderItem={renderItem}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
        }}
        columnWrapperStyle={columns > 1 ? {
          justifyContent: 'space-between',
        } : undefined}
        accessibilityLabel="Action grid"
        accessibilityHint="Grid of action buttons for quick navigation"
      />
    </View>
  );
});

ActionGrid.displayName = 'ActionGrid';