import { Image } from "expo-image";
import React, { memo, useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, View, ViewStyle } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode, SliderImage } from "../../types/types";
import { formatDuration } from "../../utils/formatTime";
import { Badge, Icon, Text, Touchable } from "../atoms";

interface HeroCarouselProps {
  items: Episode[] | SliderImage[];
  type?: 'episode' | 'slider';
  height?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  borderRadius?: BorderRadius;
  contentPadding?: keyof typeof designTokens.spacing;
  onItemPress?: (item: Episode | SliderImage) => void;
  style?: ViewStyle;
}

const { width: screenWidth } = Dimensions.get("window");

export const HeroCarousel: React.FC<HeroCarouselProps> = memo(
  ({
    items,
    type = 'episode',
    height = 220,
    autoplay = true,
    autoplayInterval = 5000,
    borderRadius = "2xl",
    contentPadding = "lg",
    onItemPress,
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

    const handleItemPress = (item: Episode | SliderImage) => {
      onItemPress?.(item);
    };

    const renderItem = (item: Episode | SliderImage, index: number) => {
      const itemStyle: ViewStyle = {
        width: CARD_WIDTH,
        height,
        marginRight: index < items.length - 1 ? CARD_SPACING : 0,
      };

      const isEpisode = type === 'episode';
      const imageUri = isEpisode ? (item as Episode).coverUrl : (item as SliderImage).imageUrl;

      let accessibilityLabel: string;
      let accessibilityHint: string;

      if (isEpisode) {
        const episode = item as Episode;
        accessibilityLabel = `${episode.title}, duration ${formatDuration(episode.durationSec)}`;
        accessibilityHint = "Tap to play this episode";
      } else {
        accessibilityLabel = `Slider image ${index + 1}`;
        accessibilityHint = "Tap to view details";
      }

      return (
        <View key={index} style={itemStyle}>
          <Touchable
            style={{ flex: 1 }}
            onPress={() => handleItemPress(item)}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
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
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                accessibilityIgnoresInvertColors={true}
              />

              {isEpisode && (
                <>
                  {/* Gradient overlay */}
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
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        opacity: 0.8,
                      }}
                    />
                  </View>

                  {/* Content overlay */}
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
                        color="label"
                        style={{
                          marginLeft: designTokens.spacing.sm,
                          color: "rgba(235, 235, 245, 0.6)",
                        }}
                      >
                        {formatDuration((item as Episode).durationSec)}
                      </Text>
                    </View>

                    <Text
                      variant="title3"
                      color="label"
                      weight="bold"
                      numberOfLines={2}
                      style={{
                        lineHeight: designTokens.typography.fontSize.title3 * 1.2,
                      }}
                    >
                      {(item as Episode).title}
                    </Text>
                  </View>

                  {/* Play button */}
                  <View
                    style={{
                      position: "absolute",
                      top: designTokens.spacing.lg,
                      right: designTokens.spacing.lg,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: designTokens.borderRadius.full,
                        padding: designTokens.spacing.sm,
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <Icon
                        name="play"
                        size="lg"
                        color="label"
                        accessibilityLabel="Play episode"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </Touchable>
        </View>
      );
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
          {items.map((item, index) => renderItem(item, index))}
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
