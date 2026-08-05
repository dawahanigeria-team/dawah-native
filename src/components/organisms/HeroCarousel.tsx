import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View, ViewStyle, useWindowDimensions } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { useTheme } from "../../hooks/useTheme";
import { Episode } from "../../types/types";
import { formatDuration } from "../../utils/formatTime";
import { Badge } from "../atoms/Badge";
import { Icon } from "../atoms/Icon";
import { Text } from "../atoms/Text";
import { Touchable } from "../atoms/Touchable";
import { logger } from "../../utils/logger";

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

interface CarouselItemProps {
  item: Episode;
  index: number;
  totalItems: number;
  cardWidth: number;
  cardSpacing: number;
  height: number;
  borderRadius: BorderRadius;
  onItemPress?: (item: Episode) => void;
  onPlayPress?: (item: Episode) => void;
}

const CarouselItem = memo<CarouselItemProps>(({
  item,
  index,
  totalItems,
  cardWidth,
  cardSpacing,
  height,
  borderRadius,
  onItemPress,
  onPlayPress,
}) => {
  const { colors } = useTheme();
  const itemStyle: ViewStyle = {
    width: cardWidth,
    height,
    marginRight: index < totalItems - 1 ? cardSpacing : 0,
  };

  return (
    <View style={itemStyle}>
      <Touchable
        style={{ flex: 1 }}
        onPress={() => {
          logger.debug('📱 Carousel: Slide tapped (not play button)', item.title);
          onItemPress?.(item);
        }}
        accessibilityLabel={`${item.title}, duration ${formatDuration(item.durationSec)}`}
        accessibilityRole="button"
      >
        <View
          style={{
            flex: 1,
            position: "relative",
            borderRadius: designTokens.borderRadius[borderRadius],
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: item.coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            accessibilityIgnoresInvertColors={true}
          />

          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "transparent",
            }}
          >
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "60%",
                backgroundColor: colors.overlay.darkStrong,
                opacity: 0.8,
              }}
            />
          </View>

          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: designTokens.spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: designTokens.spacing.sm,
              }}
            >
              <Badge variant="primary" size="small">
                DN
              </Badge>
              <Text
                variant="caption1"
                style={{
                  marginLeft: designTokens.spacing.sm,
                  color: 'rgba(255, 255, 255, 0.8)', // Explicit white for visibility over dark overlay
                }}
              >
                {formatDuration(item.durationSec)}
              </Text>
            </View>

            <Text
              variant="title3"
              weight="bold"
              numberOfLines={2}
              style={{
                lineHeight: designTokens.typography.fontSize.title3 * 1.2,
                color: colors.fixed.white, // Explicit white for visibility over dark overlay
              }}
            >
              {item.title}
            </Text>
          </View>

          <View
            style={{
              position: "absolute",
              top: designTokens.spacing.lg,
              right: designTokens.spacing.lg,
            }}
          >
            <Touchable
              onPress={() => {
                logger.debug('🎯 Play button clicked in carousel!', item.title);
                if (onPlayPress) {
                  logger.debug('🎮 Calling onPlayPress with:', item.title);
                  onPlayPress(item);
                } else {
                  logger.debug('⚠️ onPlayPress not defined!');
                }
              }}
              style={{
                backgroundColor: colors.overlay.lightStrong,
                borderRadius: designTokens.borderRadius.full,
                width: 48,
                height: 48,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: colors.fixed.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
              accessibilityLabel="Play episode"
              accessibilityRole="button"
            >
              <Icon
                name="play"
                size="xl"
                color="primary"
                accessibilityLabel="Play"
              />
            </Touchable>
          </View>
        </View>
      </Touchable>
    </View>
  );
});

CarouselItem.displayName = "CarouselItem";

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
    const { colors } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    // Hook rather than a module-scope Dimensions.get(): card width drives the
    // paging offsets below, so a stale width after rotation left the carousel
    // snapping to the wrong card.
    const { width: screenWidth } = useWindowDimensions();

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

    const handleMomentumScrollEnd = useCallback((event: any) => {
      const contentOffset = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffset / (CARD_WIDTH + CARD_SPACING));
      setCurrentIndex(Math.max(0, Math.min(index, items.length - 1)));
    }, [CARD_WIDTH, CARD_SPACING, items.length]);

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
          onMomentumScrollEnd={handleMomentumScrollEnd}
          bounces={true}
          accessibilityLabel="Featured episodes carousel"
        >
          {items.map((item, index) => (
            <CarouselItem
              key={item.id}
              item={item}
              index={index}
              totalItems={items.length}
              cardWidth={CARD_WIDTH}
              cardSpacing={CARD_SPACING}
              height={height}
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
                      ? colors.brand.primary
                      : colors.system.label.tertiary, // 30% opacity
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
