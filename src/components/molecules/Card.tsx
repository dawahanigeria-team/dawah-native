import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { View, ViewStyle } from "react-native";
import { usePlayerStore } from "../../stores";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode, Series } from "../../types/types";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { formatDuration } from "../../utils/formatTime";
import { Badge, Icon, Text, Touchable } from "../atoms";

interface CardProps {
  variant: "square" | "landscape" | "list" | "section";
  data: Episode | Series;
  onPress?: () => void;
  onLongPress?: () => void;
  onPlayPress?: (episode: Episode) => void;
  showTime?: boolean;
  time?: string;
  showBadge?: boolean;
  badgeText?: string;
  showMeta?: boolean;
  metaValue?: string;
  borderRadius?: BorderRadius;
  style?: ViewStyle;
  playOnPress?: boolean;
}

export const Card: React.FC<CardProps> = memo(
  ({
    variant,
    data,
    onPress,
    onLongPress,
    onPlayPress,
    showTime = false,
    time,
    showBadge = false,
    badgeText = "DN",
    showMeta = false,
    metaValue,
    borderRadius = "xl",
    style,
    playOnPress = true,
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
      if (isEpisode && episode && playOnPress) {
        playEpisode(episode);
      }

      onPress?.();
    };

    const handlePlayButtonPress = (event: any) => {
      event?.stopPropagation?.();

      if (!isEpisode || !episode) return;

      if (onPlayPress) {
        onPlayPress(episode);
      } else {
        playEpisode(episode);
      }
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

              {showTime && (episode || time) && (
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
                    {time || (episode ? formatDuration(episode.durationSec) : '')}
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
        borderRadius: designTokens.borderRadius["2xl"], // More rounded for modern look
        padding: designTokens.spacing.xl, // Increased padding for breathing room
        marginBottom: designTokens.spacing.lg,
        minHeight: 120, // Increased height for better proportions
        // Apple-style subtle shadow
        shadowColor: designTokens.colors.system.label.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        // Remove border for cleaner look
        ...style,
      };

      return (
        <Touchable
          style={containerStyle}
          onPress={handlePress}
          onLongPress={onLongPress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint="Tap to view details"
          accessibilityRole="button"
        >
          {/* Album Art Container */}
          <View
            style={{
              position: "relative",
              marginRight: designTokens.spacing.lg,
            }}
          >
            {data.coverUrl && !imageError ? (
              <Image
                source={{ uri: data.coverUrl }}
                style={{
                  width: 72, // Larger album art for better visual impact
                  height: 72,
                  borderRadius: designTokens.borderRadius.xl,
                }}
                contentFit="cover"
                accessibilityIgnoresInvertColors={true}
                onError={() => {
                  setImageError(true);
                }}
              />
            ) : (
              <View style={getPlaceholderStyle(data.id, 72)}>
                <Text
                  style={{
                    fontSize: designTokens.typography.fontSize.title3,
                    fontWeight: designTokens.typography.fontWeight.bold,
                    color: designTokens.colors.system.label.primary,
                  }}
                >
                  {getInitials(data.title)}
                </Text>
              </View>
            )}

            {/* Subtle overlay for depth */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: designTokens.borderRadius.xl,
                backgroundColor: "rgba(0,0,0,0.05)",
              }}
            />
          </View>

          {/* Content Area */}
          <View
            style={{
              flex: 1,
              justifyContent: "space-between",
              paddingVertical: designTokens.spacing.xs,
            }}
          >
            {/* Top Content */}
            <View>
              <Text
                variant="body"
                color="label"
                weight="semibold"
                numberOfLines={2}
                style={{
                  lineHeight: 22,
                  marginBottom: designTokens.spacing.xs,
                  fontSize: 17, // iOS body text size
                }}
              >
                {data.title}
              </Text>
              {showMeta && metaValue && (
                <Text
                  variant="subheadline"
                  color="secondaryLabel"
                  numberOfLines={1}
                  style={{
                    marginBottom: designTokens.spacing.xs,
                    fontSize: 15, // iOS subheadline size
                  }}
                >
                  {metaValue}
                </Text>
              )}
            </View>

            {/* Bottom Content */}
            {showTime && episode && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor:
                        designTokens.colors.system.label.tertiary,
                      marginRight: designTokens.spacing.xs,
                    }}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{
                      fontSize: 13, // iOS caption size
                      fontWeight: "500",
                    }}
                  >
                    {formatDuration(episode.durationSec)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Play Button */}
          <Touchable
            style={{
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handlePlayButtonPress}
            accessibilityLabel="Play lecture"
            accessibilityRole="button"
            hapticFeedback
            minHitTarget
          >
            <View
              style={{
                width: 52, // Larger for better touch target
                height: 52,
                borderRadius: 26,
                backgroundColor: designTokens.colors.brand.primary,
                alignItems: "center",
                justifyContent: "center",
                // Apple-style play button shadow
                shadowColor: designTokens.colors.brand.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                // Subtle inner shadow effect
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Icon
                name="play"
                size="lg"
                color="#000000"
                style={{
                  marginLeft: 2, // Optical alignment for play icon
                }}
              />
            </View>
          </Touchable>
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

    const renderSectionVariant = () => {
      const containerStyle: ViewStyle = {
        width: "100%",
        minHeight: 120, // Optimized height for better space efficiency
        paddingVertical: designTokens.spacing.lg, // Reduced padding for compactness
        paddingHorizontal: designTokens.spacing.xl,
        backgroundColor: designTokens.colors.system.background.secondary,
        borderRadius: designTokens.borderRadius["2xl"], // More rounded for modern look
        marginBottom: designTokens.spacing.md, // Reduced margin for tighter spacing
        // Apple-style subtle shadow
        shadowColor: designTokens.colors.system.label.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        // Remove border for cleaner look
        ...style,
      };

      // Optimized album art size for section variant
      const imageSize = 80; // Slightly smaller for better proportions

      return (
        <Touchable
          onPress={handlePress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint={playOnPress ? "Tap to play" : "Tap to view details"}
          accessibilityRole="button"
          style={containerStyle}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Album Art Container */}
            <View
              style={{
                position: "relative",
                marginRight: designTokens.spacing.lg,
              }}
            >
              {data.coverUrl && !imageError ? (
                <Image
                  source={{ uri: data.coverUrl }}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    borderRadius: designTokens.borderRadius.xl,
                  }}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors={true}
                  onError={() => {
                    setImageError(true);
                  }}
                />
              ) : (
                <View style={getPlaceholderStyle(data.id, imageSize)}>
                  <Text
                    style={{
                      fontSize: designTokens.typography.fontSize.title3,
                      fontWeight: designTokens.typography.fontWeight.bold,
                      color: designTokens.colors.system.label.primary,
                    }}
                  >
                    {getInitials(data.title)}
                  </Text>
                </View>
              )}

              {/* Subtle overlay for depth */}
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: designTokens.borderRadius.xl,
                  backgroundColor: "rgba(0,0,0,0.05)",
                }}
              />
            </View>

            {/* Content - Vertically Layered */}
            <View
              style={{
                flex: 1,
                justifyContent: "space-between",
                paddingVertical: designTokens.spacing.xs,
              }}
            >
              {/* Top Content */}
              <View>
                <Text
                  variant="body"
                  color="label"
                  weight="semibold"
                  numberOfLines={2}
                  style={{
                    marginBottom: designTokens.spacing.sm,
                    lineHeight: 22,
                    fontSize: 17, // iOS body text size
                  }}
                >
                  {data.title}
                </Text>

                {showMeta && metaValue && (
                  <Text
                    variant="subheadline"
                    color="secondaryLabel"
                    numberOfLines={1}
                    style={{
                      marginBottom: designTokens.spacing.sm,
                      lineHeight: 18,
                      fontSize: 15, // iOS subheadline size
                    }}
                  >
                    {metaValue}
                  </Text>
                )}
              </View>

              {/* Bottom Content */}
              {showTime && episode && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor:
                        designTokens.colors.system.label.tertiary,
                      marginRight: designTokens.spacing.xs,
                    }}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{
                      fontSize: 13, // iOS caption size
                      fontWeight: "500",
                    }}
                  >
                    {formatDuration(episode.durationSec)}
                  </Text>
                </View>
              )}
            </View>

            {/* Play Button */}
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                marginLeft: designTokens.spacing.md,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: designTokens.colors.brand.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  // Apple-style play button shadow
                  shadowColor: designTokens.colors.brand.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                  // Subtle inner shadow effect
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Icon
                  name="play"
                  size="md"
                  color="#000000"
                  accessibilityLabel="Play button"
                  style={{
                    marginLeft: 1, // Optical alignment for play icon
                  }}
                />
              </View>
            </View>
          </View>
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
        case "section":
          return renderSectionVariant();
        default:
          return renderSquareVariant();
      }
    };

    return renderContent();
  }
);

Card.displayName = "Card";
