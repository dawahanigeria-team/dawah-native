import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../src/components/atoms";
import { useAnnouncements } from "../../src/hooks/useAnnouncements";
import { useTheme } from "../../src/hooks/useTheme";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getTypeLabel = (type?: string): string => {
  if (type === "alert") return "Alert";
  if (type === "update") return "Update";
  return "Announcement";
};

export default function AnnouncementDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const announcementId = Array.isArray(id) ? id[0] : id;

  const { announcements, loading, markAsRead } = useAnnouncements();

  const announcement = useMemo(() => {
    if (!announcementId) return null;
    return announcements.find((item) => item.id === announcementId) || null;
  }, [announcementId, announcements]);

  useEffect(() => {
    if (!announcement || announcement.read) return;
    void markAsRead(announcement.id);
  }, [announcement, markAsRead]);

  const body = announcement?.body || announcement?.message || "";
  const accentColor =
    announcement?.type === "alert"
      ? colors.semantic.red
      : announcement?.type === "update"
        ? colors.brand.primary
        : colors.palette.blue500;
  const bodyParagraphs = body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const screenStyle = useMemo(
    () => [styles.screen, { backgroundColor: colors.system.background.primary }],
    [colors.system.background.primary],
  );
  const headerTitleStyle = useMemo(
    () => [styles.headerTitle, { color: colors.system.label.primary }],
    [colors.system.label.primary],
  );
  const headerStyle = useMemo(
    () => [
      styles.header,
      {
        paddingTop: insets.top + designTokens.spacing.sm,
      },
    ],
    [insets.top],
  );
  const heroCardStyle = useMemo(
    () => [styles.heroCard, { backgroundColor: colors.system.background.secondary }],
    [colors.system.background.secondary],
  );
  const heroGradientColors = useMemo(
    () => [`${accentColor}26`, `${colors.system.background.secondary}00`] as const,
    [accentColor, colors.system.background.secondary],
  );
  const iconWrapStyle = useMemo(
    () => [styles.iconWrap, { backgroundColor: `${accentColor}1A` }],
    [accentColor],
  );
  const typePillStyle = useMemo(
    () => [styles.typePill, { backgroundColor: `${accentColor}1A` }],
    [accentColor],
  );
  const typeTextStyle = useMemo(
    () => [styles.typeText, { color: accentColor }],
    [accentColor],
  );
  const dateTextStyle = useMemo(
    () => [styles.detailDate, { color: colors.system.label.tertiary }],
    [colors.system.label.tertiary],
  );
  const titleTextStyle = useMemo(
    () => [styles.title, { color: colors.system.label.primary }],
    [colors.system.label.primary],
  );
  const newBadgeStyle = useMemo(
    () => [styles.newBadge, { backgroundColor: `${colors.brand.primary}1F` }],
    [colors.brand.primary],
  );
  const newBadgeTextStyle = useMemo(
    () => [styles.newBadgeText, { color: colors.brand.primary }],
    [colors.brand.primary],
  );
  const bodyCardStyle = useMemo(
    () => [
      styles.bodyCard,
      {
        backgroundColor: colors.system.background.secondary,
        borderColor: colors.system.separator.primary,
        borderLeftColor: accentColor,
      },
    ],
    [colors.system.background.secondary, colors.system.separator.primary, accentColor],
  );
  const bodyTextStyle = useMemo(
    () => [styles.bodyText, { color: colors.system.label.secondary }],
    [colors.system.label.secondary],
  );
  const leadTextStyle = useMemo(
    () => [styles.leadText, { color: colors.system.label.primary }],
    [colors.system.label.primary],
  );

  if (loading) {
    return (
      <SafeAreaView
        style={screenStyle}
        edges={["left", "right", "bottom"]}
      >
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text
            style={[
              tw`mt-4`,
              {
                color: colors.system.label.secondary,
                fontSize: designTokens.typography.fontSize.body,
              },
            ]}
          >
            Loading announcement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!announcement) {
    return (
      <SafeAreaView
        style={screenStyle}
        edges={["left", "right", "bottom"]}
      >
        <View style={headerStyle}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-3`}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.system.label.primary}
            />
          </TouchableOpacity>
          <Text style={headerTitleStyle}>
            Announcement
          </Text>
        </View>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Text
            style={[
              styles.notFoundText,
              {
                fontSize: designTokens.typography.fontSize.body,
                color: colors.system.label.secondary,
              },
            ]}
          >
            Announcement not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={screenStyle}
      edges={["left", "right", "bottom"]}
    >
      <View style={headerStyle}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`mr-3`}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.system.label.primary}
          />
        </TouchableOpacity>
        <Text style={headerTitleStyle}>
          Announcement
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={heroCardStyle}>
          <LinearGradient
            colors={heroGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlow}
          />
          <View style={styles.heroRow}>
            <View style={iconWrapStyle}>
              <Ionicons name="megaphone" size={22} color={accentColor} />
            </View>
            <View style={styles.metaColumn}>
              <View style={typePillStyle}>
                <Text style={typeTextStyle}>
                  {getTypeLabel(announcement.type)}
                </Text>
              </View>
              <Text style={dateTextStyle}>
                {formatDate(announcement.created_at)}
              </Text>
            </View>
            {!announcement.read && (
              <View style={newBadgeStyle}>
                <Text style={newBadgeTextStyle}>
                  New
                </Text>
              </View>
            )}
          </View>
          <Text style={titleTextStyle}>
            {announcement.title}
          </Text>
        </View>

        <View style={bodyCardStyle}>
          {bodyParagraphs.length > 0 ? (
            bodyParagraphs.map((paragraph, index) => (
              <Text
                key={`${announcement.id}-${index}`}
                style={[
                  bodyTextStyle,
                  index === 0 ? leadTextStyle : null,
                  index === bodyParagraphs.length - 1
                    ? styles.bodyTextLast
                    : null,
                ]}
              >
                {paragraph}
              </Text>
            ))
          ) : (
            <Text
              style={[bodyTextStyle, leadTextStyle]}
            >
              {body}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: designTokens.typography.fontSize.title2,
    fontWeight: designTokens.typography.fontWeight.bold,
  },
  content: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing["5xl"],
  },
  heroCard: {
    borderRadius: designTokens.borderRadius["2xl"],
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md,
    ...designTokens.shadows.sm,
    overflow: "hidden",
  },
  heroGlow: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: designTokens.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  metaColumn: {
    flex: 1,
    gap: designTokens.spacing.xs,
  },
  typePill: {
    alignSelf: "flex-start",
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  typeText: {
    fontWeight: designTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: designTokens.typography.fontSize.caption1,
  },
  notFoundText: {
    textAlign: "center",
  },
  detailDate: {
    marginTop: 6,
    fontSize: designTokens.typography.fontSize.caption1,
  },
  title: {
    fontSize: designTokens.typography.fontSize.title1,
    fontWeight: designTokens.typography.fontWeight.bold,
    lineHeight:
      designTokens.typography.fontSize.title1 *
      designTokens.typography.lineHeight.normal,
  },
  newBadge: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: "rgba(48, 209, 88, 0.12)",
  },
  newBadgeText: {
    fontWeight: designTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: designTokens.typography.fontSize.caption2,
  },
  bodyCard: {
    marginTop: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.xl,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  bodyText: {
    marginBottom: designTokens.spacing.md,
    fontSize: designTokens.typography.fontSize.body,
    lineHeight:
      designTokens.typography.fontSize.body *
      designTokens.typography.lineHeight.relaxed,
  },
  leadText: {
    fontSize: designTokens.typography.fontSize.callout,
    fontWeight: designTokens.typography.fontWeight.semibold,
  },
  bodyTextLast: {
    marginBottom: 0,
  },
});
