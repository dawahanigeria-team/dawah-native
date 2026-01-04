import { Image } from "expo-image";
import React, { memo } from "react";
import { View, ViewStyle } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode } from "../../types/types";
import { formatDuration } from "../../utils/formatTime";
import { Badge, Icon, Text, Touchable } from "../atoms";
import { logger } from "../../utils/logger";

interface HeroCarouselItemProps {
  item: Episode;
  width: number;
  height: number;
  marginRight: number;
  borderRadius: BorderRadius;
  onPress: (item: Episode) => void;
  onPlayPress?: (item: Episode) => void;
}

export const HeroCarouselItem = memo(({
  item,
  width,
  height,
  marginRight,
  borderRadius,
  onPress,
  onPlayPress
}: HeroCarouselItemProps) => {
  const itemStyle: ViewStyle = {
    width,
    height,
    marginRight,
  };

  return (
    <View style={itemStyle}>
      <Touchable
        style={{ flex: 1 }}
        onPress={() => {
            logger.debug('📱 Carousel: Slide tapped (not play button)', item.title);
            onPress(item);
        }}
        accessibilityLabel={`${item.title}, duration ${formatDuration(
          item.durationSec
        )}`}
        accessibilityHint="Tap to play this episode"
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
                {formatDuration(item.durationSec)}
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
              {item.title}
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
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: designTokens.borderRadius.full,
                width: 48,
                height: 48,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
              accessibilityLabel="Play episode"
              accessibilityRole="button"
              accessibilityHint="Tap to play this episode immediately"
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

HeroCarouselItem.displayName = "HeroCarouselItem";
