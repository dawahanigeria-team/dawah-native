import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { View, ViewStyle } from "react-native";
import { usePlayerStore } from "../../stores/playerStore";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode, Series } from "../../types/types";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { formatDuration } from "../../utils/formatTime";
import { Badge, Icon, Text, Touchable } from "../atoms";

interface CardProps {
  variant: "square" | "landscape" | "list";
  data: Episode | Series;
  onPress?: () => void;
  showTime?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  showMeta?: boolean;
  metaValue?: string;
  borderRadius?: BorderRadius;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = memo(
  ({
    variant,
    data,
    onPress,
    showTime = false,
    showBadge = false,
    badgeText = "DN",
    showMeta = false,
    metaValue,
    borderRadius = "xl",
    style,
  }) => {
    const isEpisode = "durationSec" in data;
    const episode = isEpisode ? (data as Episode) : null;
    const [imageError, setImageError] = useState(false);
    const { playEpisode } = usePlayerStore();

    const getAccessibilityLabel = () => {
      let label = `${data.title}`;
      if (isEpisode && episode && showTime) {
        label += `, duration ${formatDuration(episode.durationSec)}`;
      }
      if (showMeta && metaValue) {
        label += `, ${metaValue}`;
      }
      return label;
    };

    const handlePress = () => {
      if (isEpisode && episode) {
        // Play the episode in the mini player (will start expanded)
        playEpisode(episode);
      }
      // Call the original onPress if provided
      onPress?.();
    };

    const renderSquareVariant = () => {
      const containerStyle: ViewStyle = {
        width: "100%", // Use full width of parent container
        ...style,
      };

      // Calculate image size based on container width (140px from parent)
      const imageSize = 140;

      return (
        <View style={containerStyle}>
          <Touchable
            onPress={handlePress}
            accessibilityLabel={getAccessibilityLabel()}
            accessibilityHint="Tap to view details"
            accessibilityRole="button"
            style={{
              borderRadius: designTokens.borderRadius[borderRadius],
              overflow: "hidden",
            }}
          >
            <View style={{ position: "relative" }}>
              {data.coverUrl && !imageError ? (
                <Image
                  source={{ uri: data.coverUrl }}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    borderRadius: designTokens.borderRadius[borderRadius],
                  }}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors={true}
                  placeholder={require("../../../assets/placeholder.png")}
                  onError={() => {
                    setImageError(true);
                  }}
                />
              ) : (
                <View style={getPlaceholderStyle(data.id, imageSize)}>
                  <Text
                    style={{
                      fontSize: designTokens.typography.fontSize.title1,
                      fontWeight: designTokens.typography.fontWeight.bold,
                      color: designTokens.colors.system.label.primary,
                    }}
                  >
                    {getInitials(data.title)}
                  </Text>
                </View>
              )}

              {/* Only show badge if explicitly requested and it's not the default "DN" */}
              {showBadge && badgeText && badgeText !== "DN" && (
                <View
                  style={{
                    position: "absolute",
                    top: designTokens.spacing.sm,
                    right: designTokens.spacing.sm,
                  }}
                >
                  <Badge variant="primary" size="small">
                    {badgeText}
                  </Badge>
                </View>
              )}

              {showTime && episode && (
                <View
                  style={{
                    position: "absolute",
                    bottom: designTokens.spacing.sm,
                    left: designTokens.spacing.sm,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    paddingHorizontal: designTokens.spacing.sm,
                    paddingVertical: designTokens.spacing.xs,
                    borderRadius: designTokens.borderRadius.md,
                  }}
                >
                  <Text variant="caption1" color="brand">
                    {formatDuration(episode.durationSec)}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ marginTop: designTokens.spacing.sm }}>
              <Text
                variant="subheadline"
                color="label"
                weight="semibold"
                numberOfLines={2}
                style={{
                  lineHeight:
                    designTokens.typography.fontSize.subheadline *
                    designTokens.typography.lineHeight.normal,
                }}
              >
                {data.title}
              </Text>
              {showMeta && metaValue && (
                <Text
                  variant="caption1"
                  color="secondaryLabel"
                  style={{ marginTop: designTokens.spacing.xs }}
                >
                  {metaValue}
                </Text>
              )}
            </View>
          </Touchable>
        </View>
      );
    };

    const renderLandscapeVariant = () => {
      const containerStyle: ViewStyle = {
        flexDirection: "row",
        backgroundColor: designTokens.colors.system.background.secondary,
        borderRadius: designTokens.borderRadius.xl,
        padding: designTokens.spacing.lg,
        marginBottom: designTokens.spacing.md,
        minHeight: designTokens.hitTargets.large,
        ...designTokens.shadows.lg, // Use larger shadow for more depth
        borderWidth: 1,
        borderColor: designTokens.colors.system.separator.primary,
        ...style,
      };

      return (
        <Touchable
          style={containerStyle}
          onPress={handlePress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint="Tap to view details"
          accessibilityRole="button"
        >
          {data.coverUrl && !imageError ? (
            <Image
              source={{ uri: data.coverUrl }}
              style={{
                width: designTokens.spacing["5xl"] - designTokens.spacing.md, // 48px
                height: designTokens.spacing["5xl"] - designTokens.spacing.md, // 48px
                borderRadius: designTokens.borderRadius.lg,
              }}
              contentFit="cover"
              accessibilityIgnoresInvertColors={true}
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <View
              style={getPlaceholderStyle(
                data.id,
                designTokens.spacing["5xl"] - designTokens.spacing.md
              )}
            >
              <Text
                style={{
                  fontSize: designTokens.typography.fontSize.headline,
                  fontWeight: designTokens.typography.fontWeight.bold,
                  color: designTokens.colors.system.label.primary,
                }}
              >
                {getInitials(data.title)}
              </Text>
            </View>
          )}

          <View
            style={{
              flex: 1,
              marginLeft: designTokens.spacing.lg,
              justifyContent: "center",
            }}
          >
            <Text
              variant="headline"
              color="label"
              weight="semibold"
              numberOfLines={2}
              style={{
                lineHeight:
                  designTokens.typography.fontSize.headline *
                  designTokens.typography.lineHeight.normal,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              {data.title}
            </Text>
            {showMeta && metaValue && (
              <Text
                variant="subheadline"
                color="secondaryLabel"
                style={{
                  marginBottom: designTokens.spacing.sm,
                }}
              >
                {metaValue}
              </Text>
            )}
            {showTime && episode && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: designTokens.spacing.xs,
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={designTokens.colors.system.label.secondary}
                  style={{ marginRight: designTokens.spacing.xs }}
                />
                <Text variant="caption1" color="secondaryLabel">
                  {formatDuration(episode.durationSec)}
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              justifyContent: "center",
              padding: designTokens.spacing.sm,
            }}
          >
            <View
              style={{
                width: designTokens.spacing["5xl"],
                height: designTokens.spacing["5xl"],
                borderRadius: designTokens.spacing["5xl"] / 2,
                backgroundColor: designTokens.colors.brand.primary,
                alignItems: "center",
                justifyContent: "center",
                ...designTokens.shadows.lg,
                shadowColor: designTokens.colors.brand.primary,
              }}
            >
              <Icon
                name="play"
                size="lg"
                color="#000000"
                accessibilityLabel="Play button"
              />
            </View>
          </View>
        </Touchable>
      );
    };

    const renderListVariant = () => {
      const containerStyle: ViewStyle = {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: designTokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: designTokens.colors.system.separator.primary,
        minHeight: designTokens.hitTargets.large,
        ...style,
      };

      return (
        <Touchable
          style={containerStyle}
          onPress={handlePress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint="Tap to view details"
          accessibilityRole="button"
        >
          {data.coverUrl && !imageError ? (
            <Image
              source={{ uri: data.coverUrl }}
              style={{
                width: designTokens.spacing["5xl"],
                height: designTokens.spacing["5xl"],
                borderRadius: designTokens.borderRadius.md,
              }}
              contentFit="cover"
              accessibilityIgnoresInvertColors={true}
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <View
              style={getPlaceholderStyle(data.id, designTokens.spacing["5xl"])}
            >
              <Text
                style={{
                  fontSize: designTokens.typography.fontSize.footnote,
                  fontWeight: designTokens.typography.fontWeight.bold,
                  color: designTokens.colors.system.label.primary,
                }}
              >
                {getInitials(data.title)}
              </Text>
            </View>
          )}

          <View
            style={{
              flex: 1,
              marginLeft: designTokens.spacing.md,
            }}
          >
            <Text
              variant="body"
              color="label"
              weight="medium"
              numberOfLines={1}
            >
              {data.title}
            </Text>
            {showMeta && metaValue && (
              <Text variant="subheadline" color="secondaryLabel">
                {metaValue}
              </Text>
            )}
          </View>

          {showTime && episode && (
            <Text variant="subheadline" color="secondaryLabel">
              {formatDuration(episode.durationSec)}
            </Text>
          )}
        </Touchable>
      );
    };

    const renderContent = () => {
      switch (variant) {
        case "square":
          return renderSquareVariant();
        case "landscape":
          return renderLandscapeVariant();
        case "list":
          return renderListVariant();
        default:
          return renderSquareVariant();
      }
    };

    return renderContent();
  }
);

Card.displayName = "Card";
