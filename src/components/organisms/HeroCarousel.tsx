import { Image } from "expo-image";
import React, { memo, useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, View, ViewStyle } from "react-native";
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
    const scrollViewRef = useRef<ScrollView>(null);

    const CARD_WIDTH = screenWidth - designTokens.spacing.lg * 2;
    const CARD_SPACING = designTokens.spacing.sm;

    useEffect(() => {
      if (!autoplay || items.length <= 1) return;

      const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % items.length;
        setCurrentIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (CARD_WIDTH + CARD_SPACING),
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

    const handleScroll = (event: any) => {
      const contentOffset = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffset / (CARD_WIDTH + CARD_SPACING));
      setCurrentIndex(Math.max(0, Math.min(index, items.length - 1)));
    };

    const containerStyle: ViewStyle = {
      marginBottom: designTokens.spacing["4xl"],
      ...style,
    };

    return (
      <View style={containerStyle}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: designTokens.spacing[contentPadding],
          }}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
          accessibilityLabel="Featured episodes carousel"
        >
          {items.map((item, index) => (
            <HeroCarouselItem
              key={item.id}
              item={item}
              width={CARD_WIDTH}
              height={height}
              marginRight={index < items.length - 1 ? CARD_SPACING : 0}
              borderRadius={borderRadius}
              onItemPress={onItemPress}
              onPlayPress={onPlayPress}
            />
          ))}
        </ScrollView>

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
