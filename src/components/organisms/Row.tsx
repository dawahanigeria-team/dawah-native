import React, { memo } from 'react';
import { View, ScrollView, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/designTokens';
import { Touchable, Text, Icon } from '../atoms';

interface RowProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSeeAll?: () => void;
  showChevron?: boolean;
  horizontalSnap?: boolean;
  snapInterval?: number;
  contentPadding?: keyof typeof designTokens.spacing;
  style?: ViewStyle;
}

export const Row: React.FC<RowProps> = memo(({
  title,
  subtitle,
  children,
  onSeeAll,
  showChevron = true,
  horizontalSnap = true,
  snapInterval = 144,
  contentPadding = 'lg',
  style,
}) => {
  const containerStyle: ViewStyle = {
    marginBottom: designTokens.spacing.lg,
    ...style,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
  };

  const contentContainerStyle = {
    paddingHorizontal: designTokens.spacing.lg,
  };

  return (
    <View style={containerStyle}>
      {/* Header Section */}
      <View style={headerStyle}>
        <View style={{ flex: 1 }}>
          <Text 
            variant="h4" 
            color="primary"
            weight="bold"
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle && (
            <Text 
              variant="bodySmall" 
              color="muted"
              style={{ marginTop: designTokens.spacing.xs }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        
        {onSeeAll && (
          <Touchable
            onPress={onSeeAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: designTokens.spacing.sm,
              minHeight: designTokens.hitTargets.minimum,
            }}
            accessibilityLabel={`See all ${title.toLowerCase()}`}
            accessibilityHint="Tap to view all items in this section"
            accessibilityRole="button"
          >
            <Text 
              variant="bodySmall" 
              color="primary"
              weight="semibold"
              style={{ 
                marginRight: designTokens.spacing.xs,
                color: designTokens.colors.brand.primary,
              }}
            >
              See All
            </Text>
            {showChevron && (
              <Icon 
                name="chevron-forward" 
                size="sm" 
                color={designTokens.colors.brand.primary}
                accessibilityLabel="Navigate forward"
              />
            )}
          </Touchable>
        )}
      </View>
      
      {/* Content Section */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        snapToInterval={horizontalSnap ? snapInterval : undefined}
        decelerationRate={horizontalSnap ? 'fast' : 'normal'}
        bounces={true}
        scrollEventThrottle={16}
        accessibilityLabel={`Horizontal scrollable list of ${title.toLowerCase()}`}
      >
        {children}
      </ScrollView>
    </View>
  );
});

Row.displayName = 'Row';