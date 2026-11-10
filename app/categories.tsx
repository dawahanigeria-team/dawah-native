import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlashList } from "../src/components/adapters/flashListCompat";
import { ScreenHeader } from "../src/components/molecules";
import { useTheme } from "../src/hooks/useTheme";
import { useGuardedPush } from "../src/navigation/useGuardedPush";
import { ApiError } from "../src/services/api/base.api";
import { Category, categoriesApi } from "../src/services/api/categories.api";
import tw from "../src/theme/twrnc";

const NUM_COLUMNS = 2;

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const guardedPush = useGuardedPush();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCategories = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      setCategories(await categoriesApi.getCategories());
    } catch (err) {
      // A cancelled request is the expected outcome of navigating away; it is
      // not something the user caused, so it must not render as a failure.
      if (err instanceof ApiError && err.isCancelled) return;

      setError(
        err instanceof ApiError && (err.isTimeout || err.isNetworkError)
          ? err.message
          : "We couldn't load the topics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query),
    );
  }, [categories, searchQuery]);

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <TouchableOpacity
        onPress={() =>
          guardedPush({
            pathname: "/category/[id]",
            params: { id: item.id, name: item.name },
          })
        }
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        style={tw`flex-1 m-2`}
      >
        <View
          style={[
            tw`rounded-2xl overflow-hidden`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <Image
            source={{ uri: item.img }}
            style={tw`w-full h-28`}
            contentFit="cover"
            transition={150}
          />
          <View style={tw`px-3 py-3`}>
            <Text
              style={[
                tw`text-sm font-semibold`,
                { color: colors.system.label.primary },
              ]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [colors, guardedPush],
  );

  const renderBody = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
          <Text style={[tw`mt-2`, { color: colors.system.label.secondary }]}>
            Loading topics...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8`}>
          <Text
            style={[
              tw`text-center mb-4`,
              { color: colors.system.label.secondary },
            ]}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => void fetchCategories()}
            accessibilityRole="button"
            style={[
              tw`px-6 py-3 rounded-lg`,
              { backgroundColor: colors.system.fill.tertiary },
            ]}
          >
            <Text style={{ color: colors.system.label.primary }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlashList
        data={filteredCategories}
        renderItem={renderCategory}
        keyExtractor={(item: Category) => `category-${item.id}`}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={tw`px-3 pb-20`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchCategories(true)}
            tintColor={colors.brand.primary}
          />
        }
        ListEmptyComponent={
          <View style={tw`px-5 py-10 items-center`}>
            <Text
              style={[
                tw`text-center`,
                { color: colors.system.label.secondary },
              ]}
            >
              {searchQuery
                ? "No topics match your search"
                : "No topics available"}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader title="Topics" />

      <View style={tw`px-5 pb-4`}>
        <View
          style={[
            tw`flex-row items-center rounded-lg px-4 py-3`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={colors.system.label.tertiary}
          />
          <TextInput
            style={[tw`flex-1 ml-3`, { color: colors.system.label.primary }]}
            placeholder="Search topics"
            placeholderTextColor={colors.system.label.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.system.label.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}
