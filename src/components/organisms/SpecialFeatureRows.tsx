import Ionicons from "@expo/vector-icons/Ionicons";
import { Image as ExpoImage } from "expo-image";
import { memo, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { useTheme } from "../../hooks/useTheme";
import type { SpecialFeatureGroup, SpecialFeatureLecture } from "../../services/api/specialFeatures.api";
import tw from "../../theme/twrnc";
import type { Episode } from "../../types/types";
import { FlashList } from "../adapters/flashListCompat";
import { Text } from "../atoms";

const CARD_WIDTH = 140;

interface SpecialFeatureRowsProps {
  groups: SpecialFeatureGroup[];
  rowLimit: number;
  onOpenLecture: (episode: Episode) => void;
  onSeeAll: (groupName: string) => void;
}

export const SpecialFeatureRows = memo(function SpecialFeatureRows({
  groups,
  rowLimit,
  onOpenLecture,
  onSeeAll,
}: SpecialFeatureRowsProps) {
  const { colors } = useTheme();

  const renderCard = useCallback(
    ({ item }: { item: SpecialFeatureLecture }) => {
      const { episode } = item;
      return (
        <TouchableOpacity
          onPress={() => onOpenLecture(episode)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={episode.rpname ? `${episode.title}, ${episode.rpname}` : episode.title}
          style={[
            styles.card,
            tw`rounded-2xl overflow-hidden`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <ExpoImage
            source={{ uri: episode.coverUrl }}
            style={tw`w-full aspect-square`}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            accessible={false}
          />
          <View style={tw`p-2`}>
            <Text variant="footnote" color="label" weight="medium" numberOfLines={2}>
              {episode.title}
            </Text>
            {episode.rpname ? (
              <Text variant="caption2" color="secondaryLabel" numberOfLines={1} style={tw`mt-1`}>
                {episode.rpname}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [colors, onOpenLecture],
  );

  return (
    <>
      {groups.map((group) => {
        const hasMore = group.lectures.length > rowLimit;
        return (
          <View key={group.name} style={tw`mt-8`}>
            <View style={styles.header}>
              <Text
                variant="title3"
                color="label"
                weight="bold"
                numberOfLines={2}
                accessibilityRole="header"
                style={tw`flex-1 mr-2`}
              >
                {group.name}
              </Text>
              {hasMore && (
                <TouchableOpacity
                  onPress={() => onSeeAll(group.name)}
                  style={tw`flex-row items-center min-h-[44px]`}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`See all ${group.name}`}
                >
                  <Text variant="subheadline" weight="semibold" color="brand">
                    See All
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.brand.primary}
                    style={tw`ml-1`}
                  />
                </TouchableOpacity>
              )}
            </View>
            <FlashList
              data={group.lectures.slice(0, rowLimit)}
              renderItem={renderCard}
              keyExtractor={(item: SpecialFeatureLecture, index: number) => `${group.name}-${item.episode.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4`}
            />
          </View>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
});
