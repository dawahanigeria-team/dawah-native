import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../src/components/atoms";
import { useTheme } from "../../src/hooks/useTheme";
import { ramadanApi, RamadanAlbum } from "../../src/services/api/ramadan.api";
import tw from "../../src/theme/twrnc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 2 columns with padding and gap

export default function RamadanYearScreen() {
  const { colors } = useTheme();
  const { year } = useLocalSearchParams<{ year: string }>();
  const yearNum = parseInt(year || "0", 10);

  const [albums, setAlbums] = useState<RamadanAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [yearName, setYearName] = useState("");

  const fetchAlbumsCallback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const grouped = await ramadanApi.getRamadanAlbumsGrouped();
      const yearGroup = grouped.yearGroups.find((g) => g.year === yearNum);

      if (yearGroup) {
        setAlbums(yearGroup.albums);
        setYearName(yearGroup.name);
      } else {
        setAlbums([]);
        setYearName(`Ramadan Tafseer ${yearNum}`);
      }
    } catch (err) {
      console.error("Error fetching albums:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [yearNum]);

  useEffect(() => {
    if (yearNum > 0) {
      fetchAlbumsCallback();
    }
  }, [yearNum, fetchAlbumsCallback]);

  const handleAlbumPress = useCallback((album: RamadanAlbum) => {
    if (!album?.id) return;
    router.push(`/album/${album.id}`);
  }, []);

  const renderAlbumCard = useCallback(
    ({ item, index }: { item: RamadanAlbum; index: number }) => {
      return (
        <Animated.View
          entering={FadeInUp.delay(index * 30).duration(300)}
          style={[{ width: CARD_WIDTH }, tw`mb-4`]}
        >
          <TouchableOpacity
            onPress={() => handleAlbumPress(item)}
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
                source={{ uri: item.alb_thumbnail || item.img }}
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
                <Text variant="caption2" style={[tw`ml-1`, { color: "#fff" }]}>
                  {item.views || 0}
                </Text>
              </View>
              {/* Lectures count badge */}
              <View
                style={[
                  tw`absolute bottom-2 right-2 flex-row items-center px-2 py-1 rounded-full`,
                  { backgroundColor: colors.brand.primary },
                ]}
              >
                <Ionicons name="musical-notes" size={12} color={colors.fixed.black} />
                <Text
                  variant="caption2"
                  style={[tw`ml-1`, { color: colors.fixed.black }]}
                >
                  {item.lec_no || 0}
                </Text>
              </View>
            </View>
            <View style={tw`p-3`}>
              <Text
                variant="footnote"
                color="label"
                weight="medium"
                numberOfLines={2}
                style={tw`leading-4`}
              >
                {item.name}
              </Text>
              <Text
                variant="caption2"
                color="secondaryLabel"
                style={tw`mt-1`}
              >
                {item.language}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, handleAlbumPress]
  );

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
          Loading albums...
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
        <TouchableOpacity
          onPress={fetchAlbumsCallback}
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
      <View style={tw`px-4 py-3`}>
        <View style={tw`flex-row items-center mb-2`}>
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
            <View style={tw`flex-row items-baseline`}>
              <Text
                style={[
                  tw`text-4xl font-light`,
                  { color: colors.system.label.primary },
                ]}
              >
                {yearNum}
              </Text>
              <Text
                variant="title3"
                style={[tw`ml-2`, { color: colors.brand.primary }]}
              >
                AH
              </Text>
            </View>
          </View>
        </View>
        <Text variant="title2" color="label" weight="semibold">
          {yearName}
        </Text>
        <Text variant="subheadline" color="secondaryLabel" style={tw`mt-1`}>
          {albums.length} albums available
        </Text>
      </View>

      {/* Albums Grid */}
      <FlatList
        data={albums}
        renderItem={renderAlbumCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={tw`px-4 pb-32`}
        columnWrapperStyle={tw`justify-between`}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={tw`flex-1 items-center justify-center py-20`}>
            <Ionicons
              name="library-outline"
              size={64}
              color={colors.system.label.tertiary}
            />
            <Text
              variant="title3"
              color="secondaryLabel"
              style={tw`mt-4 text-center`}
            >
              No albums found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
