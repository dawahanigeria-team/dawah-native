import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "../../src/components/atoms";
import { ErrorBoundary } from "../../src/components/atoms/ErrorBoundary";
import { ScreenHeader } from "../../src/components/molecules/ScreenHeader";
import { useLecturers } from "../../src/hooks/useLecturers";
import { useTheme } from "../../src/hooks/useTheme";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import { Category, categoriesApi } from "../../src/services/api/categories.api";
import tw from "../../src/theme/twrnc";
import { getInitials } from "../../src/utils/colorPlaceholder";

const SCHOLAR_COUNT = 10;
const TOPIC_COUNT = 4;

export default function ExploreScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <ExploreScreen />
    </ErrorBoundary>
  );
}

function ExploreScreen() {
  const { colors } = useTheme();
  const guardedPush = useGuardedPush();
  const { lecturerCards } = useLecturers(SCHOLAR_COUNT);
  const [topics, setTopics] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    categoriesApi
      .getCategories()
      .then((categories) => {
        if (active) setTopics(categories.slice(0, TOPIC_COUNT));
      })
      // The tiles are a shortcut: "All topics" still works, and retries, on failure.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const renderSideTile = (
    title: string,
    subtitle: string,
    icon: keyof typeof Ionicons.glyphMap,
    route: string,
  ) => (
    <TouchableOpacity
      onPress={() => guardedPush(route as never)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={[styles.sideTile, { backgroundColor: colors.system.background.secondary }]}
    >
      <Ionicons name={icon} size={20} color={colors.brand.primary} />
      <View>
        <Text variant="subheadline" weight="semibold">
          {title}
        </Text>
        <Text variant="caption1" color="secondaryLabel">
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string, linkLabel: string, route: string) => (
    <View style={styles.sectionHeader}>
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      <TouchableOpacity
        onPress={() => guardedPush(route as never)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${linkLabel}, ${title}`}
        style={styles.sectionLink}
      >
        <Text variant="subheadline" weight="semibold" color="brand">
          {linkLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.system.background.primary }]}>
      <ScreenHeader variant="large" title="Explore" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-40`}>
        <Pressable
          onPress={() => guardedPush("/search")}
          accessibilityRole="button"
          accessibilityLabel="Search lectures, scholars or surahs"
          style={[styles.search, { backgroundColor: colors.system.background.secondary }]}
        >
          <Ionicons name="search" size={20} color={colors.system.label.secondary} />
          <Text variant="callout" color="tertiaryLabel" numberOfLines={1}>
            Lectures, scholars or surahs
          </Text>
        </Pressable>

        <View style={styles.featured}>
          <TouchableOpacity
            onPress={() => guardedPush("/section/quran-recitations")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Quran, recitations by reciter"
            style={tw`flex-1`}
          >
            <LinearGradient
              colors={["#12372A", "#1F6B3E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quranTile}
            >
              <Text style={styles.quranArabic}>القرآن الكريم</Text>
              <View>
                <Text variant="title2" style={styles.onDark}>
                  Quran
                </Text>
                <Text variant="footnote" style={styles.onDarkMuted}>
                  Recitations by reciter
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.sideColumn}>
            {renderSideTile("Charts", "Most heard", "trending-up", "/charts")}
            {renderSideTile("Ramadan", "Tafsir by year", "moon", "/ramadan-tafsir")}
          </View>
        </View>

        <View style={tw`mt-6`}>
          {renderSectionHeader("Browse by topic", "All topics", "/categories")}
          <View style={styles.topicGrid}>
            {topics.map((topic, index) => (
              <TouchableOpacity
                key={topic.id}
                onPress={() =>
                  guardedPush({
                    pathname: "/category/[id]",
                    params: { id: topic.id, name: topic.name },
                  })
                }
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={topic.name}
                style={[
                  styles.topicTile,
                  {
                    backgroundColor:
                      colors.palette.placeholder[index % colors.palette.placeholder.length],
                  },
                ]}
              >
                <Text variant="title3" numberOfLines={2} style={styles.onDark}>
                  {topic.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {lecturerCards.length > 0 && (
          <View style={tw`mt-6`}>
            {renderSectionHeader("Scholars to follow", "See all", "/lecturers")}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scholarShelf}
            >
              {lecturerCards.map((scholar) => (
                <TouchableOpacity
                  key={scholar.id}
                  onPress={() => guardedPush(`/lecturer/${scholar.id}`)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={scholar.name}
                  style={styles.scholar}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.system.background.tertiary }]}>
                    {scholar.imageUrl ? (
                      <Image
                        source={{ uri: scholar.imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessible={false}
                      />
                    ) : (
                      <Text variant="title3">{getInitials(scholar.name)}</Text>
                    )}
                  </View>
                  <Text variant="caption1" weight="medium" align="center" numberOfLines={2}>
                    {scholar.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  search: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 18,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featured: {
    flexDirection: "row",
    gap: 10,
    height: 190,
    marginHorizontal: 16,
    marginTop: 20,
  },
  quranTile: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    justifyContent: "space-between",
  },
  quranArabic: {
    fontSize: 28,
    color: "#FFFFFF",
  },
  onDark: {
    color: "#FFFFFF",
  },
  onDarkMuted: {
    color: "#E3EDDD",
  },
  sideColumn: {
    width: 130,
    gap: 10,
  },
  sideTile: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    justifyContent: "space-between",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  sectionLink: {
    minHeight: 44,
    justifyContent: "center",
  },
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  topicTile: {
    flexBasis: "47%",
    flexGrow: 1,
    height: 84,
    padding: 14,
    borderRadius: 16,
    justifyContent: "flex-end",
  },
  scholarShelf: {
    gap: 18,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  scholar: {
    width: 84,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
