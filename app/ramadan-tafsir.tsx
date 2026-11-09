import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useGuardedPush } from "../src/navigation/useGuardedPush";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../src/components/atoms";
import { ScreenHeader } from "../src/components/molecules";
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
  const guardedPush = useGuardedPush();
  const { colors } = useTheme();
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  // Declared above the effect that calls it: as a `const`, a reference from an
  // effect placed earlier binds before initialization.
  useEffect(() => {
    fetchRamadanData();
  }, []);

  const handleViewAllAlbums = (year: number) => {
    guardedPush(`/ramadan-year/${year}`);
  };

  const renderLatestYearHero = () => {
    if (yearGroups.length === 0) return null;
    const latestYear = yearGroups[0];

    return (
      <View style={tw`mb-6`}>
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
                style={{ color: colors.brand.onPrimary }}
              >
                Latest collection
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
                Series
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
                style={{ color: colors.brand.onPrimary }}
              >
                Browse {latestYear.year} AH
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.brand.onPrimary}
                style={tw`ml-2`}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

      </View>
    );
  };

  const renderPreviousYears = () => {
    if (yearGroups.length <= 1) return null;

    return (
      <View style={tw`px-4 mt-2`}>
        <Text variant="title3" color="label" style={tw`mb-2`} accessibilityRole="header">
          Earlier years
        </Text>
        {yearGroups.slice(1).map((yearGroup) => (
          <TouchableOpacity
            key={yearGroup.year}
            onPress={() => handleViewAllAlbums(yearGroup.year)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${yearGroup.year} AH, ${yearGroup.totalCount} series`}
            style={[
              tw`flex-row items-center justify-between py-4`,
              { borderBottomWidth: 1, borderBottomColor: colors.system.separator.primary },
            ]}
          >
            <Text variant="title3" color="label">
              {yearGroup.year} AH
            </Text>
            <View style={tw`flex-row items-center`}>
              <Text variant="subheadline" color="secondaryLabel" style={tw`mr-2`}>
                {yearGroup.totalCount} series
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.system.label.tertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const header = (
    <ScreenHeader
      title="Ramadan Tafsir"
      subtitle="A journey through sacred teachings"
    />
  );

  if (loading) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[
          tw`flex-1`,
          { backgroundColor: colors.system.background.primary },
        ]}
      >
        {header}
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text variant="body" color="secondaryLabel" style={tw`mt-4`}>
            Loading Ramadan Tafsir...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[
          tw`flex-1`,
          { backgroundColor: colors.system.background.primary },
        ]}
      >
        {header}
        <View style={tw`flex-1 items-center justify-center px-6`}>
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
              style={{ color: colors.brand.onPrimary }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
      edges={["left", "right"]}
    >
      {header}

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
