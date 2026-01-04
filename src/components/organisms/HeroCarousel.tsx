import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, View, ViewStyle } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode } from "../../types/types";
import { HeroCarouselItem } from "./HeroCarouselItem";

interface HeroCarouselProps {
  items: Episode[];
  height?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  borderRadius?: BorderRadius;
  contentPadding?: keyof typeof designTokens.spacing;
  onItemPress?: (item: Episode) => void;
  onPlayPress?: (item: Episode) => void;
  style?: ViewStyle;
}

const { width: screenWidth } = Dimensions.get("window");

export const HeroCarousel: React.FC<HeroCarouselProps> = memo(
  ({
    items,
    height = 220,
    autoplay = true,
    autoplayInterval = 5000,
    borderRadius = "2xl",
    contentPadding = "lg",
    onItemPress,
    onPlayPress,
    style,
  }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList<Episode>>(null);

    const CARD_WIDTH = screenWidth - designTokens.spacing.lg * 2;
    const CARD_SPACING = designTokens.spacing.sm;
    const TOTAL_ITEM_WIDTH = CARD_WIDTH + CARD_SPACING;

    useEffect(() => {
      if (!autoplay || items.length <= 1) return;

      const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % items.length;
        // Don't update state here, scroll will trigger handleScroll which updates state.
        // Actually, if we scroll programmatically, we should ensure state is sync or let onScroll handle it.
        // But for infinite loop effect or just simple carousel:

        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        setCurrentIndex(nextIndex); // Optimistic update
      }, autoplayInterval);

      return () => clearInterval(interval);
    }, [
      currentIndex,
      items.length,
      autoplay,
      autoplayInterval,
      // Removed CARD_WIDTH and CARD_SPACING from deps as they are constant per render
    ]);

    const handleScroll = useCallback((event: any) => {
      const contentOffset = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffset / TOTAL_ITEM_WIDTH);
      const safeIndex = Math.max(0, Math.min(index, items.length - 1));

      // Only update if changed to avoid re-renders
      // setCurrentIndex inside useEffect might conflict if we do it here too aggressively
      // But we need it for manual scrolls.
      setCurrentIndex(safeIndex);
    }, [TOTAL_ITEM_WIDTH, items.length]);

    // Use onMomentumScrollEnd for more stable index updates during manual scroll
    // But onScroll provides real-time updates for dots if needed.
    // Given the previous implementation used onScroll, we stick to it but maybe debounce or just use it.

    const renderItem = useCallback(({ item, index }: { item: Episode; index: number }) => {
      return (
        <HeroCarouselItem
          item={item}
          width={CARD_WIDTH}
          height={height}
          marginRight={index < items.length - 1 ? CARD_SPACING : 0}
          borderRadius={borderRadius}
          onPress={onItemPress!} // We need to handle undefined? HeroCarouselItem expects func.
          // Actually HeroCarouselItem expects `onPress`. If `onItemPress` is undefined, we should pass a no-op or handle it.
          // In previous code: `onItemPress?.(item)` inside handleItemPress.
          // So we should pass a wrapper that checks existence.
          onPlayPress={onPlayPress}
        />
      );
    }, [CARD_WIDTH, height, CARD_SPACING, items.length, borderRadius, onItemPress, onPlayPress]);

    // We need to ensure onPress passed to HeroCarouselItem is safe.
    // Let's modify renderItem slightly.
    const safeOnPress = useCallback((item: Episode) => {
        if (onItemPress) onItemPress(item);
    }, [onItemPress]);

    const renderItemSafe = useCallback(({ item, index }: { item: Episode; index: number }) => {
        return (
          <HeroCarouselItem
            item={item}
            width={CARD_WIDTH}
            height={height}
            marginRight={index < items.length - 1 ? CARD_SPACING : 0}
            borderRadius={borderRadius}
            onPress={safeOnPress}
            onPlayPress={onPlayPress}
          />
        );
      }, [CARD_WIDTH, height, CARD_SPACING, items.length, borderRadius, safeOnPress, onPlayPress]);


    const containerStyle: ViewStyle = {
      marginBottom: designTokens.spacing["4xl"],
      ...style,
    };

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: TOTAL_ITEM_WIDTH,
        offset: TOTAL_ITEM_WIDTH * index,
        index,
    }), [TOTAL_ITEM_WIDTH]);

    const keyExtractor = useCallback((item: Episode) => item.id, []);

    return (
      <View style={containerStyle}>
        <FlatList
          ref={flatListRef}
          data={items}
          renderItem={renderItemSafe}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: designTokens.spacing[contentPadding],
          }}
          snapToInterval={TOTAL_ITEM_WIDTH}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
          getItemLayout={getItemLayout}
          accessibilityLabel="Featured episodes carousel"
          // Optimization props
          initialNumToRender={1} // Hero usually shows 1
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={true}
        />

        {/* Pagination dots */}
        {items.length > 1 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: designTokens.spacing.lg,
              paddingHorizontal: designTokens.spacing[contentPadding],
            }}
          >
            {items.map((_, index) => (
              <View
                key={index}
                style={{
                  width: designTokens.spacing.sm,
                  height: designTokens.spacing.sm,
                  borderRadius: designTokens.borderRadius.full,
                  marginHorizontal: designTokens.spacing.xs,
                  backgroundColor:
                    index === currentIndex
                      ? designTokens.colors.brand.primary
                      : "rgba(235, 235, 245, 0.3)", // 30% opacity
                }}
                accessibilityLabel={`Page ${index + 1} of ${items.length}`}
              />
            ))}
          </View>
        )}
      </View>
    );
  }
);

HeroCarousel.displayName = "HeroCarousel";
