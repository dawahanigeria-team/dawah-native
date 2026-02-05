import React, { memo } from "react";
import { ScrollView, View, ViewStyle, FlatList, ListRenderItem } from "react-native";
import { designTokens } from "../../theme/designTokens";
import { Icon, Text, Touchable } from "../atoms";

interface RowProps<T = any> {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  data?: T[];
  renderItem?: ListRenderItem<T>;
  keyExtractor?: (item: T, index: number) => string;
  ItemSeparatorComponent?: React.ComponentType<any> | null;
  onSeeAll?: () => void;
  showChevron?: boolean;
  horizontalSnap?: boolean;
  snapInterval?: number;
  contentPadding?: keyof typeof designTokens.spacing;
  style?: ViewStyle;
}

const RowComponent = <T,>({
    title,
    subtitle,
    children,
    data,
    renderItem,
    keyExtractor,
    ItemSeparatorComponent,
    onSeeAll,
    showChevron = true,
    horizontalSnap = true,
    snapInterval = 160,
    contentPadding = "lg",
    style,
  }: RowProps<T>) => {
    const containerStyle: ViewStyle = {
      marginBottom: designTokens.spacing.lg,
      ...style,
    };

    const horizontalPadding = designTokens.spacing[contentPadding];

    const headerStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: designTokens.spacing.md,
      paddingHorizontal: horizontalPadding,
    };

    const contentContainerStyle = {
      paddingHorizontal: horizontalPadding,
    };

    const Header = (
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
    );

    if (data && renderItem) {
      return (
        <View style={containerStyle}>
          {Header}
          <FlatList
            horizontal
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={ItemSeparatorComponent}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={contentContainerStyle}
            snapToInterval={horizontalSnap ? snapInterval : undefined}
            decelerationRate={horizontalSnap ? "fast" : "normal"}
            bounces={true}
            scrollEventThrottle={16}
            accessibilityLabel={`Horizontal scrollable list of ${title.toLowerCase()}`}
            initialNumToRender={4}
            windowSize={5}
            maxToRenderPerBatch={4}
          />
        </View>
      );
    }

    return (
      <View style={containerStyle}>
        {Header}
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
  };

// Preserve generic type signature through memo
// See: https://react.dev/reference/react/memo#memo-with-generics
export const Row = memo(RowComponent) as <T>(props: RowProps<T>) => React.ReactElement | null;
