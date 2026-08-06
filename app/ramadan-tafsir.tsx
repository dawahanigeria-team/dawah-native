import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../src/components/atoms";
import { useTheme } from "../src/hooks/useTheme";
import { ramadanApi, RamadanAlbum } from "../src/services/api/ramadan.api";
import tw from "../src/theme/twrnc";

interface YearGroup {
  year: number;
  name: string;
  totalCount: number;
  albums: RamadanAlbum[];
  isExpanded: boolean;
}

export default function RamadanTafsirScreen() {
  // useWindowDimensions, not a module-scope Dimensions.get(): the old
  // value was captured at import and never updated on rotation or resize.
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 2 columns with padding and gap
  const { colors } = useTheme();
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchRamadanData();
  }, []);

  const fetchRamadanData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ramadanApi.getRamadanAlbumsGrouped();

      // Sort by year descending (latest first)
      const sortedGroups = response.yearGroups
        .sort((a, b) => b.year - a.year)
        .map((group, index) => ({
          ...group,
          isExpanded: index === 0, // Only expand the latest year
        }));

      setYearGroups(sortedGroups);
    } catch (err) {
      console.error("Error fetching Ramadan data:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYearExpanded = (year: number) => {
    setYearGroups((prev) =>
      prev.map((group) =>
        group.year === year ? { ...group, isExpanded: !group.isExpanded } : group
      )
    );
  };

  const handleAlbumPress = useCallback((album: RamadanAlbum) => {
    if (!album?.id) return;
    router.push(`/album/${album.id}`);
  }, []);

  const handleViewAllAlbums = (year: number) => {
    router.push(`/ramadan-year/${year}`);
  };

  const renderAlbumCard = useCallback(
    (album: RamadanAlbum, index: number) => {
      return (
        <Animated.View
          key={album.id}
          entering={FadeInUp.delay(index * 50).duration(300)}
          style={{ width: CARD_WIDTH }}
        >
          <TouchableOpacity
            onPress={() => handleAlbumPress(album)}
            activeOpacity={0.8}
            style={[
              tw`rounded-xl overflow-hidden`,
              {
                backgroundColor: colors.system.background.secondary,
              },
            ]}
          >
            <View style={tw`relative`}>
              <Image
                source={{ uri: album.alb_thumbnail || album.img }}
                style={[tw`w-full aspect-square`, { borderRadius: 12 }]}
                resizeMode="cover"
              />
              {/* Views badge */}
              <View
                style={[
                  tw`absolute bottom-2 left-2 flex-row items-center px-2 py-1 rounded-full`,
                  { backgroundColor: "rgba(0,0,0,0.7)" },
                ]}
              >
                <Ionicons name="eye-outline" size={12} color="#fff" />
                <Text
                  variant="caption2"
                  style={[tw`ml-1`, { color: "#fff" }]}
                >
                  {album.views || 0}
                </Text>
              </View>
            </View>
            <View style={tw`p-3`}>
              <Text
                variant="subheadline"
                color="label"
                weight="semibold"
                numberOfLines={3}
                style={tw`leading-5`}
              >
                {album.name}
              </Text>
              <Text
                variant="caption2"
                color="secondaryLabel"
                style={tw`mt-1`}
              >
                {album.lec_no} {album.lec_no === 1 ? 'lecture' : 'lectures'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, handleAlbumPress, CARD_WIDTH]
  );

  const renderLatestYearHero = () => {
    if (yearGroups.length === 0) return null;
    const latestYear = yearGroups[0];

    return (
      <Animated.View entering={FadeIn.duration(500)} style={tw`mb-6`}>
        {/* Hero Background */}
        <LinearGradient
          colors={[
            colors.brand.primary + "20",
            colors.system.background.primary,
          ]}
          style={[tw`mx-4 rounded-3xl overflow-hidden`, { minHeight: 280 }]}
        >
          {/* Decorative moon and stars */}
          <View style={tw`absolute top-4 right-4 opacity-30`}>
            <Ionicons name="moon" size={80} color={colors.brand.primary} />
          </View>
          <View style={tw`absolute top-8 right-24 opacity-20`}>
            <Ionicons name="star" size={20} color={colors.semantic.yellow} />
          </View>
          <View style={tw`absolute top-16 right-16 opacity-20`}>
            <Ionicons name="star" size={14} color={colors.semantic.yellow} />
          </View>

          <View style={tw`p-6`}>
            {/* Latest Collection Badge */}
            <View
              style={[
                tw`self-start px-4 py-2 rounded-full mb-4`,
                { backgroundColor: colors.brand.primary },
              ]}
            >
              <Text
                variant="caption1"
                weight="semibold"
                style={{ color: colors.fixed.black }}
              >
                LATEST COLLECTION
              </Text>
            </View>

            {/* Year Display */}
            <View style={tw`flex-row items-baseline mb-2`}>
              <Text
                style={[
                  tw`text-6xl font-light`,
                  { color: colors.system.label.primary },
                ]}
              >
                {latestYear.year}
              </Text>
              <Text
                variant="title3"
                style={[tw`ml-2`, { color: colors.brand.primary }]}
              >
                AH
              </Text>
            </View>

            {/* Title */}
            <Text
              variant="title2"
              color="label"
              weight="semibold"
              style={tw`mb-4`}
            >
              {latestYear.name}
            </Text>

            {/* Album Count */}
            <View style={tw`flex-row items-baseline mb-5`}>
              <Text
                style={[
                  tw`text-4xl font-light`,
                  { color: colors.brand.primary },
                ]}
              >
                {latestYear.totalCount}
              </Text>
              <Text
                variant="body"
                color="secondaryLabel"
                style={tw`ml-2`}
              >
                Albums
              </Text>
            </View>

            {/* View All Button */}
            <TouchableOpacity
              onPress={() => handleViewAllAlbums(latestYear.year)}
              style={[
                tw`flex-row items-center justify-center py-4 rounded-xl`,
                { backgroundColor: colors.brand.primary },
              ]}
              activeOpacity={0.8}
            >
              <Text
                variant="body"
                weight="semibold"
                style={{ color: colors.fixed.black }}
              >
                View All {latestYear.totalCount} Albums
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.fixed.black}
                style={tw`ml-2`}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Preview Section */}
        <View style={tw`mt-6 px-4`}>
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View>
              <Text
                variant="caption1"
                weight="semibold"
                style={{ color: colors.brand.primary }}
              >
                PREVIEW
              </Text>
              <Text variant="caption1" color="secondaryLabel">
                Showing {Math.min(4, latestYear.albums.length)} of{" "}
                {latestYear.totalCount} albums
              </Text>
            </View>
          </View>

          {/* Preview Albums Grid */}
          <View style={tw`flex-row flex-wrap justify-between`}>
            {latestYear.albums.slice(0, 4).map((album, index) => (
              <View key={album.id} style={tw`mb-3`}>
                {renderAlbumCard(album, index)}
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderPreviousYears = () => {
    if (yearGroups.length <= 1) return null;
    const previousYears = yearGroups.slice(1);

    return (
      <View style={tw`px-4 mt-4`}>
        <Text
          variant="title2"
          color="label"
          weight="semibold"
          style={tw`mb-6`}
        >
          Previous Years
        </Text>

        {previousYears.map((yearGroup, groupIndex) => (
          <Animated.View
            key={yearGroup.year}
            entering={FadeInDown.delay(groupIndex * 100).duration(400)}
            style={[
              tw`mb-6 rounded-2xl overflow-hidden`,
              { backgroundColor: colors.system.background.secondary },
            ]}
          >
            {/* Year Header - Always visible */}
            <TouchableOpacity
              onPress={() => toggleYearExpanded(yearGroup.year)}
              activeOpacity={0.8}
              style={tw`p-4`}
            >
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                  {/* Timeline dot */}
                  <View
                    style={[
                      tw`w-3 h-3 rounded-full mr-4`,
                      { backgroundColor: colors.brand.primary },
                    ]}
                  />
                  <View>
                    {/* Year Badge */}
                    <View
                      style={[
                        tw`self-start px-3 py-1 rounded-lg mb-2`,
                        { backgroundColor: colors.system.fill.tertiary },
                      ]}
                    >
                      <Text
                        variant="subheadline"
                        weight="semibold"
                        style={{ color: colors.brand.primary }}
                      >
                        {yearGroup.year} AH
                      </Text>
                    </View>
                    <Text variant="headline" color="label" weight="semibold">
                      {yearGroup.name}
                    </Text>
                    <Text variant="footnote" color="secondaryLabel" style={tw`mt-1`}>
                      {yearGroup.totalCount} albums available
                    </Text>
                  </View>
                </View>

                {/* Expand/Collapse Icon */}
                <Ionicons
                  name={yearGroup.isExpanded ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={colors.system.label.secondary}
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Content */}
            {yearGroup.isExpanded && (
              <View style={tw`px-4 pb-4`}>
                {/* View All Button */}
                <TouchableOpacity
                  onPress={() => handleViewAllAlbums(yearGroup.year)}
                  style={[
                    tw`flex-row items-center justify-center py-3 rounded-xl mb-4`,
                    { backgroundColor: colors.brand.primary + "20" },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    variant="subheadline"
                    weight="semibold"
                    style={{ color: colors.brand.primary }}
                  >
                    View All {yearGroup.totalCount} Albums
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.brand.primary}
                    style={tw`ml-1`}
                  />
                </TouchableOpacity>

                {/* Preview Albums */}
                <View style={tw`flex-row flex-wrap justify-between`}>
                  {yearGroup.albums.slice(0, 4).map((album, index) => (
                    <View key={album.id} style={tw`mb-3`}>
                      {renderAlbumCard(album, index)}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 items-center justify-center`,
          { backgroundColor: colors.system.background.primary },
        ]}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text variant="body" color="secondaryLabel" style={tw`mt-4`}>
          Loading Ramadan Tafsir...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 items-center justify-center px-6`,
          { backgroundColor: colors.system.background.primary },
        ]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={64}
          color={colors.system.label.tertiary}
        />
        <Text
          variant="title3"
          color="label"
          weight="semibold"
          style={tw`mt-4 text-center`}
        >
          Failed to load
        </Text>
        <Text
          variant="body"
          color="secondaryLabel"
          style={tw`mt-2 text-center`}
        >
          Please check your connection and try again
        </Text>
        <TouchableOpacity
          onPress={fetchRamadanData}
          style={[
            tw`mt-6 px-6 py-3 rounded-full`,
            { backgroundColor: colors.brand.primary },
          ]}
        >
          <Text
            variant="body"
            weight="semibold"
            style={{ color: colors.fixed.black }}
          >
            Retry
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`mr-4 p-1`}
          activeOpacity={0.6}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={colors.brand.primary}
          />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text variant="caption1" color="secondaryLabel">
            A JOURNEY THROUGH SACRED TEACHINGS
          </Text>
          <Text variant="title2" color="label" weight="bold">
            Ramadan Tafsir
          </Text>
        </View>
        <View
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center`,
            { backgroundColor: colors.brand.primary + "20" },
          ]}
        >
          <Ionicons name="moon" size={20} color={colors.brand.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-32`}
      >
        {renderLatestYearHero()}
        {renderPreviousYears()}
      </ScrollView>
    </SafeAreaView>
  );
}
