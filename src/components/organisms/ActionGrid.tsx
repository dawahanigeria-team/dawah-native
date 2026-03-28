import React, { memo } from 'react';
import { View, ViewStyle, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { designTokens, BorderRadius } from '../../theme/designTokens';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../atoms/Icon';
import { Text } from '../atoms/Text';
import { Touchable } from '../atoms/Touchable';

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
    color: designTokens.colorsDark.palette.blue500,
    description: 'View trending content'
  },
  {
    id: '2',
    title: 'Lecturers',
    icon: 'people',
    color: designTokens.colorsDark.palette.green500,
    description: 'Browse all lecturers'
  },
  {
    id: '3',
    title: 'Playlist',
    icon: 'list',
    color: designTokens.colorsDark.palette.amber500,
    description: 'Your saved playlists'
  },
  {
    id: '4',
    title: 'Ramadan',
    icon: 'moon',
    color: designTokens.colorsDark.semantic.purple,
    description: 'Ramadan Tafsir collections'
  },
  {
    id: '5',
    title: 'Quran',
    icon: 'book',
    color: designTokens.colorsDark.palette.emerald500,
    description: 'Quran recitations'
  },
  {
    id: '6',
    title: 'Trending',
    icon: 'flame',
    color: designTokens.colorsDark.palette.orange500,
    description: 'Most popular content'
  },
];

export const ActionGrid: React.FC<ActionGridProps> = memo(({
  items = defaultActions,
  columns = 3,
  itemSpacing: _itemSpacing = 'md',
  contentPadding: _contentPadding = 'lg',
  borderRadius = 'xl',
  onItemPress,
  style,
}) => {
  const router = useRouter();
  const { colors } = useTheme();

  const handleItemPress = (item: ActionItem) => {
    if (item.id === '1' && item.title === 'Chart') {
      router.push('/charts');
    } else if (item.id === '2' && item.title === 'Lecturers') {
      router.push('/lecturers');
    } else if (item.id === '3' && item.title === 'Playlist') {
      router.push('/playlists');
    } else if (item.id === '4' && item.title === 'Ramadan') {
      router.push('/ramadan-tafsir');
    } else if (item.id === '5' && item.title === 'Quran') {
      router.push('/section/quran-recitations');
    } else if (item.id === '6' && item.title === 'Trending') {
      router.push('/section/trending');
    } else {
      onItemPress?.(item);
    }
  };

  const renderItem = ({ item, index: _index }: { item: ActionItem; index: number }) => {
    const itemWidth = (
      100 - (columns - 1) * 2
    ) / columns;

    const itemStyle: ViewStyle = {
      width: `${itemWidth}%`,
      marginBottom: designTokens.spacing.sm,
    };

    const cardStyle: ViewStyle = {
      backgroundColor: colors.system.background.secondary,
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
