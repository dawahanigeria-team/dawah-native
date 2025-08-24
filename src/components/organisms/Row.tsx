import React, { memo } from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { designTokens } from "../../theme/designTokens";
import { Icon, Text, Touchable } from "../atoms";

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

export const Row: React.FC<RowProps> = memo(
  ({
    title,
    subtitle,
    children,
    onSeeAll,
    showChevron = true,
    horizontalSnap = true,
    snapInterval = 160,
    contentPadding = "lg",
    style,
  }) => {
    const containerStyle: ViewStyle = {
      marginBottom: designTokens.spacing.lg,
      ...style,
    };

    const headerStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
              variant="title2"
              color="label"
              weight="bold"
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                variant="subheadline"
                color="secondaryLabel"
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
                flexDirection: "row",
                alignItems: "center",
                padding: designTokens.spacing.sm,
                minHeight: designTokens.hitTargets.minimum,
              }}
              accessibilityLabel={`See all ${title.toLowerCase()}`}
              accessibilityHint="Tap to view all items in this section"
              accessibilityRole="button"
            >
              <Text
                variant="subheadline"
                color="brand"
                weight="semibold"
                style={{
                  marginRight: designTokens.spacing.xs,
                }}
              >
                More
              </Text>
              {showChevron && (
                <Icon
                  name="chevron-forward"
                  size="sm"
                  color="brand"
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
          decelerationRate={horizontalSnap ? "fast" : "normal"}
          bounces={true}
          scrollEventThrottle={16}
          accessibilityLabel={`Horizontal scrollable list of ${title.toLowerCase()}`}
        >
          {children}
        </ScrollView>
      </View>
    );
  }
);

Row.displayName = "Row";
