import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import { Dimensions, View, ViewStyle, FlatList, ListRenderItem } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode } from "../../types/types";
import { logger } from "../../utils/logger";
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

    useEffect(() => {
      if (!autoplay || items.length <= 1) return;

      const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % items.length;
        setCurrentIndex(nextIndex);
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * (CARD_WIDTH + CARD_SPACING),
          animated: true,
        });
      }, autoplayInterval);

      return () => clearInterval(interval);
    }, [
      currentIndex,
      items.length,
      autoplay,
      autoplayInterval,
      CARD_WIDTH,
      CARD_SPACING,
    ]);

    const handleScroll = useCallback((event: any) => {
      const contentOffset = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffset / (CARD_WIDTH + CARD_SPACING));
      setCurrentIndex(Math.max(0, Math.min(index, items.length - 1)));
    }, [CARD_WIDTH, CARD_SPACING, items.length]);

    const handleItemPress = useCallback((item: Episode) => {
      logger.debug('📱 Carousel: Slide tapped (not play button)', item.title);
      onItemPress?.(item);
    }, [onItemPress]);

    const renderItem: ListRenderItem<Episode> = useCallback(({ item }) => (
      <HeroCarouselItem
        item={item}
        width={CARD_WIDTH}
        height={height}
        borderRadius={borderRadius}
        onPress={handleItemPress}
        onPlayPress={onPlayPress}
      />
    ), [CARD_WIDTH, height, borderRadius, handleItemPress, onPlayPress]);

    const keyExtractor = useCallback((item: Episode) => item.id, []);

    const getItemLayout = useCallback((_: any, index: number) => ({
      length: CARD_WIDTH,
      offset: (CARD_WIDTH + CARD_SPACING) * index,
      index,
    }), [CARD_WIDTH, CARD_SPACING]);

    const ItemSeparator = useCallback(() => (
      <View style={{ width: CARD_SPACING }} />
    ), [CARD_SPACING]);

    const containerStyle: ViewStyle = {
      marginBottom: designTokens.spacing["4xl"],
      ...style,
    };

    return (
      <View style={containerStyle}>
        <FlatList
          ref={flatListRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: designTokens.spacing[contentPadding],
          }}
          ItemSeparatorComponent={ItemSeparator}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
          getItemLayout={getItemLayout}
          accessibilityLabel="Featured episodes carousel"
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
