import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { View, ViewStyle } from "react-native";
import { usePlayerActions } from "../../stores";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { useTheme } from "../../hooks/useTheme";
import { Episode, Series, Video } from "../../types/types";
import { getInitials, getPlaceholderStyle } from "../../utils/colorPlaceholder";
import { formatDuration } from "../../utils/formatTime";
import { Badge, Icon, Text, Touchable } from "../atoms";

interface CardProps {
  variant: "square" | "landscape" | "list" | "section";
  data: Episode | Series | Video;
  onPress?: () => void;
  onLongPress?: () => void;
  onPlayPress?: (episode: Episode) => void;
  onMorePress?: () => void;
  showTime?: boolean;
  time?: string;
  showBadge?: boolean;
  badgeText?: string;
  showMeta?: boolean;
  metaValue?: string;
  /**
   * Optional line limits for title/meta text.
   * Use 0 to allow unlimited lines (wrap fully).
   */
  titleNumberOfLines?: number;
  metaNumberOfLines?: number;
  borderRadius?: BorderRadius;
  style?: ViewStyle;
  playOnPress?: boolean;
  isVideo?: boolean; // Indicates if this card is for a video
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
    titleNumberOfLines,
    metaNumberOfLines,
    borderRadius = "xl",
    style,
    playOnPress = true,
    onMorePress,
    isVideo = false,
  }) => {
    // Type detection: Check isVideo flag first, then check for video-specific properties,
    // finally check for episode-specific properties
    const hasVideoProperties = 'youtubeId' in data || 'thumbnailUrl' in data;
    const hasEpisodeProperties = 'audioUrl' in data && (data as any).audioUrl; // Only if audioUrl has a value

    const isActualVideo = isVideo || hasVideoProperties;
    const isEpisode = !isActualVideo && hasEpisodeProperties;

    const episode = isEpisode ? (data as Episode) : null;
    const video = isActualVideo ? (data as Video) : null;
    const [imageError, setImageError] = useState(false);
    const { playEpisode } = usePlayerActions();
    const { colors } = useTheme();

    // Safe access to coverUrl or thumbnailUrl
    const coverUrl = (data as any).coverUrl || (data as any).thumbnailUrl;

    const getAccessibilityLabel = () => {
      let label = `${data.title}`;
      if (isVideo) {
        label += `, video`;
      }
      if ((isEpisode && episode && showTime) || (isVideo && video && showTime)) {
        const durationSec = isVideo && video ? video.durationSec : (episode?.durationSec || 0);
        label += `, duration ${formatDuration(durationSec)}`;
      }
      if (showMeta && metaValue) {
        label += `, ${metaValue}`;
      }
      return label;
    };

    const handlePress = () => {
      // For videos, always just call onPress without playing audio
      if (isVideo) {
        onPress?.();
        return;
      }

      // For episodes, play if playOnPress is true
      if (isEpisode && episode && playOnPress) {
        playEpisode(episode);
      }

      onPress?.();
    };

    const handlePlayButtonPress = (event: any) => {
      event?.stopPropagation?.();

      // For videos, navigate to video player (same as card press)
      if (isVideo) {
        onPress?.();
        return;
      }

      // For episodes, play audio
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
          >
            <View style={{ position: "relative", width: imageSize, height: imageSize }}>
              {coverUrl && !imageError ? (
                <Image
                  source={{ uri: coverUrl }}
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
                <View style={[
                  getPlaceholderStyle(data.id, imageSize),
                  { borderRadius: designTokens.borderRadius[borderRadius] }
                ]}>
                  <Text
                    style={{
                      fontSize: designTokens.typography.fontSize.title1,
                      fontWeight: designTokens.typography.fontWeight.bold,
                      color: colors.system.label.primary,
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

              {/* Video Badge - show on top-right corner if this is a video */}
              {isVideo && (
                <View
                  style={{
                    position: "absolute",
                    top: designTokens.spacing.sm,
                    right: designTokens.spacing.sm,
                    backgroundColor: colors.semantic.red,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Icon
                    name="videocam"
                    size="sm"
                    color={colors.fixed.white}
                  />
                </View>
              )}

              {showTime && (episode || video || time) && (
                <View
                  style={{
                    position: "absolute",
                    bottom: designTokens.spacing.sm,
                    left: designTokens.spacing.sm,
                    backgroundColor: colors.overlay.darkHeavy,
                    paddingHorizontal: designTokens.spacing.sm,
                    paddingVertical: designTokens.spacing.xs,
                    borderRadius: designTokens.borderRadius.md,
                  }}
                >
                  <Text variant="caption1" color="brand">
                    {time || (video ? formatDuration(video.durationSec) : (episode ? formatDuration(episode.durationSec) : ''))}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ marginTop: designTokens.spacing.sm, flexShrink: 1 }}>
              <Text
                variant="subheadline"
                color="label"
                weight="semibold"
                numberOfLines={titleNumberOfLines !== undefined ? (titleNumberOfLines <= 0 ? undefined : titleNumberOfLines) : 1}
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
                  color="label"
                  weight="regular"
                  numberOfLines={metaNumberOfLines !== undefined ? (metaNumberOfLines <= 0 ? undefined : metaNumberOfLines) : 1}
                  style={{ marginTop: designTokens.spacing.xs, opacity: 0.7 }}
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
        backgroundColor: colors.system.background.secondary,
        borderRadius: designTokens.borderRadius.xl, // Slightly less rounded for space efficiency
        padding: designTokens.spacing.md, // Reduced padding for compactness (16px)
        marginBottom: designTokens.spacing.md,
        minHeight: 88, // Optimized height to fit 4+ items on screen
        // Apple-style subtle shadow
        shadowColor: colors.system.label.primary,
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
              marginRight: designTokens.spacing.md,
            }}
          >
            {coverUrl && !imageError ? (
              <Image
                source={{ uri: coverUrl }}
                style={{
                  width: 60, // Compact size for better space efficiency
                  height: 60,
                  borderRadius: designTokens.borderRadius.lg,
                }}
                contentFit="cover"
                accessibilityIgnoresInvertColors={true}
                onError={() => {
                  setImageError(true);
                }}
              />
            ) : (
              <View style={getPlaceholderStyle(data.id, 60)}>
                <Text
                  style={{
                    fontSize: designTokens.typography.fontSize.body,
                    fontWeight: designTokens.typography.fontWeight.bold,
                    color: colors.system.label.primary,
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
                borderRadius: designTokens.borderRadius.lg,
                backgroundColor: colors.overlay.darkSubtle,
              }}
            />

            {/* Video Badge - show on top-right corner if this is a video */}
            {isVideo && (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  backgroundColor: colors.semantic.red,
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Icon
                  name="videocam"
                  size="sm"
                  color={colors.fixed.white}
                />
              </View>
            )}
          </View>

          {/* Content Area */}
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingVertical: 2,
            }}
          >
            {/* Top Content */}
            <View>
              <Text
                variant="body"
                color="label"
                weight="semibold"
                numberOfLines={titleNumberOfLines !== undefined ? (titleNumberOfLines <= 0 ? undefined : titleNumberOfLines) : 2}
                style={{
                  lineHeight: 20, // Tighter line height
                  marginBottom: 4,
                  fontSize: 15, // Slightly smaller for compactness
                }}
              >
                {data.title}
              </Text>
              {showMeta && metaValue && (
                <Text
                  variant="subheadline"
                  color="secondaryLabel"
                  numberOfLines={metaNumberOfLines !== undefined ? (metaNumberOfLines <= 0 ? undefined : metaNumberOfLines) : 1}
                  style={{
                    fontSize: 13, // Compact meta text
                    lineHeight: 16,
                  }}
                >
                  {metaValue}
                </Text>
              )}
            </View>

            {/* Bottom Content */}
            {showTime && (episode || video) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
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
                      width: 3,
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor:
                        colors.system.label.tertiary,
                      marginRight: 6,
                    }}
                  />
                  <Text
                    variant="caption1"
                    color="tertiaryLabel"
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {video ? formatDuration(video.durationSec) : (episode ? formatDuration(episode.durationSec) : '')}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* More Options Button */}
            {onMorePress && (
              <Touchable
                style={{ padding: 8 }}
                onPress={onMorePress}
                accessibilityLabel="More options"
                accessibilityRole="button"
                hapticFeedback
              >
                <Icon
                  name="ellipsis-horizontal"
                  size="md"
                  color={colors.system.label.secondary}
                />
              </Touchable>
            )}

            {/* Play Button */}
            <Touchable
              style={{
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={handlePlayButtonPress}
              accessibilityLabel={isVideo ? "Play video" : "Play lecture"}
              accessibilityRole="button"
              hapticFeedback
              minHitTarget
            >
              <View
                style={{
                  width: 44, // Compact but still meets 44pt touch target
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.brand.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  // Apple-style play button shadow
                  shadowColor: colors.brand.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 5,
                  // Subtle inner shadow effect
                  borderWidth: 1,
                  borderColor: colors.overlay.lightSubtle,
                }}
              >
                <Icon
                  name="play"
                  size="md"
                  color={colors.fixed.black}
                  style={{
                    marginLeft: 2, // Optical alignment for play icon
                  }}
                />
              </View>
            </Touchable>
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
        borderBottomColor: colors.system.separator.primary,
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
          {coverUrl && !imageError ? (
            <Image
              source={{ uri: coverUrl }}
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
                  color: colors.system.label.primary,
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
        backgroundColor: colors.system.background.secondary,
        borderRadius: designTokens.borderRadius["2xl"], // More rounded for modern look
        marginBottom: designTokens.spacing.md, // Reduced margin for tighter spacing
        // Apple-style subtle shadow
        shadowColor: colors.system.label.primary,
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
              {coverUrl && !imageError ? (
                <Image
                  source={{ uri: coverUrl }}
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
                      color: colors.system.label.primary,
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
                  backgroundColor: colors.overlay.darkSubtle,
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
                  numberOfLines={titleNumberOfLines !== undefined ? (titleNumberOfLines <= 0 ? undefined : titleNumberOfLines) : 2}
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
                    numberOfLines={metaNumberOfLines !== undefined ? (metaNumberOfLines <= 0 ? undefined : metaNumberOfLines) : 1}
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
              {showTime && (episode || video) && (
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
                        colors.system.label.tertiary,
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
                    {video ? formatDuration(video.durationSec) : (episode ? formatDuration(episode.durationSec) : '')}
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
                  backgroundColor: colors.brand.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  // Apple-style play button shadow
                  shadowColor: colors.brand.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                  // Subtle inner shadow effect
                  borderWidth: 1,
                  borderColor: colors.overlay.lightSubtle,
                }}
              >
                <Icon
                  name="play"
                  size="md"
                  color={colors.fixed.black}
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