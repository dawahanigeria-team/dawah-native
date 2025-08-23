import React, { memo } from 'react';
import { View, ViewStyle, FlatList } from 'react-native';
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
    color: '#7AA2FF',
    description: 'View trending content'
  },
  { 
    id: '2', 
    title: 'Lecturers', 
    icon: 'people', 
    color: '#62D26F',
    description: 'Browse all lecturers'
  },
  { 
    id: '3', 
    title: 'Playlist', 
    icon: 'list', 
    color: '#F6C445',
    description: 'Your saved playlists'
  },
  { 
    id: '4', 
    title: 'Video', 
    icon: 'videocam', 
    color: '#FF6B6B',
    description: 'Watch video content'
  },
  { 
    id: '5', 
    title: 'Genres', 
    icon: 'musical-notes', 
    color: '#C6FF00',
    description: 'Browse by category'
  },
  { 
    id: '6', 
    title: 'Trending', 
    icon: 'flame', 
    color: '#FF8A65',
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
          onPress={() => onItemPress?.(item)}
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