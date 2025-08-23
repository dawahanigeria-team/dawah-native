import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { memo } from "react";
import { View, ViewStyle } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Episode, Series } from "../../types/types";
import { formatDuration } from "../../utils/formatTime";
import { getPlaceholderColor, getInitials } from "../../utils/colorPlaceholder";
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
    const series = !isEpisode ? (data as Series) : null;

    const getAccessibilityLabel = () => {
      let label = `${data.title}`;
      if (isEpisode && showTime) {
        label += `, duration ${formatDuration(episode.durationSec)}`;
      }
      if (showMeta && metaValue) {
        label += `, ${metaValue}`;
      }
      return label;
    };

    const renderSquareVariant = () => {
      const containerStyle: ViewStyle = {
        width: 128, // 32 * 4 (spacing scale)
        ...style,
      };

      return (
        <View style={containerStyle}>
          <Touchable
            onPress={onPress}
            accessibilityLabel={getAccessibilityLabel()}
            accessibilityHint="Tap to view details"
            accessibilityRole="button"
            style={{
              borderRadius: designTokens.borderRadius[borderRadius],
              overflow: "hidden",
            }}
          >
            <View style={{ position: "relative" }}>
              {data.coverUrl ? (
                <Image
                  source={{ uri: data.coverUrl }}
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: designTokens.borderRadius[borderRadius],
                  }}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors={true}
                  placeholder={require('../../../assets/placeholder.png')}
                  onError={() => {}}
                />
              ) : (
                <View
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: designTokens.borderRadius[borderRadius],
                    backgroundColor: getPlaceholderColor(data.id),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: 'bold',
                      color: '#FFFFFF',
                    }}
                  >
                    {getInitials(data.title)}
                  </Text>
                </View>
              )}

              {showBadge && (
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
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    paddingHorizontal: designTokens.spacing.sm,
                    paddingVertical: designTokens.spacing.xs,
                    borderRadius: designTokens.borderRadius.md,
                  }}
                >
                  <Text variant="caption" color="primary">
                    {formatDuration(episode.durationSec)}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ marginTop: designTokens.spacing.sm }}>
              <Text
                variant="bodySmall"
                color="primary"
                weight="semibold"
                numberOfLines={2}
                style={{
                  lineHeight: designTokens.typography.fontSize.sm * 1.3,
                }}
              >
                {data.title}
              </Text>
              {showMeta && metaValue && (
                <Text
                  variant="caption"
                  color="muted"
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(139, 140, 161, 0.1)",
        ...style,
      };

      return (
        <Touchable
          style={containerStyle}
          onPress={onPress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint="Tap to view details"
          accessibilityRole="button"
          activeOpacity={0.9}
        >
          {data.coverUrl ? (
            <Image
              source={{ uri: data.coverUrl }}
              style={{
                width: 72,
                height: 72,
                borderRadius: designTokens.borderRadius.lg,
              }}
              contentFit="cover"
              accessibilityIgnoresInvertColors={true}
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: designTokens.borderRadius.lg,
                backgroundColor: getPlaceholderColor(data.id),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#FFFFFF',
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
              variant="body"
              color="primary"
              weight="semibold"
              numberOfLines={2}
              style={{
                lineHeight: designTokens.typography.fontSize.base * 1.3,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              {data.title}
            </Text>
            {showMeta && metaValue && (
              <Text
                variant="bodySmall"
                color="muted"
                style={{
                  marginBottom: designTokens.spacing.xs,
                  color: "#8B8CA1",
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
                  size={14}
                  color="#8B8CA1"
                  style={{ marginRight: 4 }}
                />
                <Text
                  variant="caption"
                  color="muted"
                  style={{ color: "#8B8CA1" }}
                >
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
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: designTokens.colors.brand.primary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: designTokens.colors.brand.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
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
        borderBottomColor: designTokens.colors.border.secondary,
        minHeight: designTokens.hitTargets.large,
        ...style,
      };

      return (
        <Touchable
          style={containerStyle}
          onPress={onPress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint="Tap to view details"
          accessibilityRole="button"
        >
          {data.coverUrl ? (
            <Image
              source={{ uri: data.coverUrl }}
              style={{
                width: 48,
                height: 48,
                borderRadius: designTokens.borderRadius.md,
              }}
              contentFit="cover"
              accessibilityIgnoresInvertColors={true}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: designTokens.borderRadius.md,
                backgroundColor: getPlaceholderColor(data.id),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: '#FFFFFF',
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
              color="primary"
              weight="medium"
              numberOfLines={1}
            >
              {data.title}
            </Text>
            {showMeta && metaValue && (
              <Text variant="bodySmall" color="muted">
                {metaValue}
              </Text>
            )}
          </View>

          {showTime && episode && (
            <Text variant="bodySmall" color="muted">
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
