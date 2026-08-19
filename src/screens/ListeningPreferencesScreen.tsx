import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../components/atoms";
import { useTheme } from "../hooks/useTheme";
import { languagesApi, type Language } from "../services/api/languages.api";
import { type Lecturer, lecturersApi } from "../services/api/lecturers.api";
import {
  initializeListeningPreferences,
  markPreferenceOnboardingComplete,
  saveListeningPreferences,
  useListeningPreferencesStore,
} from "../stores/listeningPreferencesStore";
import { useAuthStore } from "../stores/authStore";

const INITIAL_SCHOLAR_LIMIT = 48;
const VISIBLE_SCHOLAR_STEP = 18;

const toggleId = (items: number[], id: number): number[] =>
  items.includes(id) ? items.filter((item) => item !== id) : [...items, id];

export default function ListeningPreferencesScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "true";
  const { colors } = useTheme();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { preferences, isHydrated, isSaving, error: syncError } =
    useListeningPreferencesStore();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
  const [lecturerIds, setLecturerIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [searching, setSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_SCHOLAR_STEP);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    void initializeListeningPreferences(isAuthenticated);
  }, [isAuthenticated, isInitialized]);

  useEffect(() => {
    if (!isHydrated || seededRef.current) return;
    seededRef.current = true;
    setLanguageIds(preferences.languageIds);
    setLecturerIds(preferences.lecturerIds);
  }, [isHydrated, preferences.languageIds, preferences.lecturerIds]);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      languagesApi.getLanguages(),
      lecturersApi.getAllLecturers({ page: 1, lim: INITIAL_SCHOLAR_LIMIT }),
    ])
      .then(([languageList, lecturerResponse]) => {
        if (!mounted) return;
        setLanguages(languageList);
        setLecturers(lecturerResponse.data);
      })
      .catch(() => {
        if (mounted) Alert.alert("Connection issue", "Some choices could not be loaded. Please retry.");
      })
      .finally(() => {
        if (mounted) setLoadingOptions(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    let mounted = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void lecturersApi
        .searchLecturers(normalized)
        .then((results) => {
          if (mounted) {
            setLecturers(results);
            setVisibleCount(Math.max(VISIBLE_SCHOLAR_STEP, results.length));
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (mounted) setSearching(false);
        });
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleLecturers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized.length < 2
      ? lecturers.filter((lecturer) =>
          !normalized || lecturer.name.toLowerCase().includes(normalized),
        )
      : lecturers;
    return filtered.slice(0, visibleCount);
  }, [lecturers, query, visibleCount]);

  const selectionCount = languageIds.length + lecturerIds.length;
  const finish = async () => {
    await markPreferenceOnboardingComplete();
    if (isOnboarding) router.replace("/(tabs)");
    else router.back();
  };

  const handleSave = async () => {
    if (selectionCount === 0) {
      Alert.alert("Choose what you enjoy", "Select at least one language or scholar.");
      return;
    }

    try {
      await saveListeningPreferences({ languageIds, lecturerIds }, isAuthenticated);
      await finish();
    } catch {
      // saveListeningPreferences persists locally before attempting remote
      // sync. Keep low-connectivity users moving and retry sync later.
      Alert.alert(
        "Saved on this device",
        "Your Home is personalized. We will sync it to your account when the connection improves.",
        [{ text: "Continue", onPress: () => void finish() }],
      );
    }
  };

  const handleSkip = async () => {
    await markPreferenceOnboardingComplete();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.system.background.primary }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.system.background.secondary }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.system.label.primary} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { backgroundColor: colors.brand.primary }]} />
        </View>
        {isOnboarding ? (
          <Pressable onPress={handleSkip} hitSlop={10}>
            <Text variant="subheadline" weight="semibold" color="secondaryLabel">
              Skip
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View style={[styles.spark, { backgroundColor: `${colors.brand.primary}20` }]}>
            <Ionicons name="headset" size={26} color={colors.brand.primary} />
          </View>
          <Text variant="title1" weight="bold" color="label" style={styles.centerText}>
            What do you want to listen to?
          </Text>
          <Text variant="body" color="secondaryLabel" style={styles.centerText}>
            Pick languages, scholars, or both. A lecture matches if it belongs to any choice.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text variant="title3" weight="bold" color="label">Languages</Text>
            <Text variant="caption1" color="secondaryLabel">Choose all that apply</Text>
          </View>
          <View style={styles.chips}>
            {languages.map((language) => {
              const selected = languageIds.includes(language.id);
              return (
                <Pressable
                  key={language.id}
                  onPress={() => setLanguageIds((current) => toggleId(current, language.id))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.brand.primary : colors.system.background.secondary,
                      borderColor: selected ? colors.brand.primary : colors.system.separator.primary,
                    },
                  ]}
                >
                  {selected && <Ionicons name="checkmark" size={15} color={colors.fixed.black} />}
                  <Text
                    variant="subheadline"
                    weight="semibold"
                    style={{ color: selected ? colors.fixed.black : colors.system.label.primary }}
                  >
                    {language.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text variant="title3" weight="bold" color="label">Scholars</Text>
            <Text variant="caption1" color="secondaryLabel">Optional</Text>
          </View>
          <View style={[styles.search, { backgroundColor: colors.system.background.secondary }]}>
            <Ionicons name="search" size={19} color={colors.system.label.tertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search nearly 300 scholars"
              placeholderTextColor={colors.system.label.tertiary}
              style={[styles.searchInput, { color: colors.system.label.primary }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={colors.brand.primary} />}
          </View>

          {loadingOptions ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.brand.primary} />
              <Text variant="footnote" color="secondaryLabel">Loading choices…</Text>
            </View>
          ) : (
            <View style={styles.scholarGrid}>
              {visibleLecturers.map((lecturer, index) => {
                const id = Number(lecturer.id);
                const selected = lecturerIds.includes(id);
                const image = lecturer.img || lecturer.rp_thumbnail;
                return (
                  <Pressable
                    key={`${String(lecturer.id)}-${index}`}
                    onPress={() => setLecturerIds((current) => toggleId(current, id))}
                    style={styles.scholar}
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.avatar,
                        {
                          borderColor: selected ? colors.brand.primary : colors.system.separator.primary,
                          borderWidth: selected ? 3 : 1,
                          backgroundColor: colors.system.background.secondary,
                        },
                      ]}
                    >
                      {image ? (
                        <Image
                          source={{ uri: image }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={120}
                        />
                      ) : (
                        <Ionicons name="person" size={28} color={colors.system.label.tertiary} />
                      )}
                      {selected && (
                        <View style={[styles.check, { backgroundColor: colors.brand.primary }]}>
                          <Ionicons name="checkmark" size={13} color={colors.fixed.black} />
                        </View>
                      )}
                    </View>
                    <Text variant="caption1" weight="semibold" color="label" numberOfLines={2} style={styles.scholarName}>
                      {lecturer.name}
                    </Text>
                    <Text variant="caption2" color="secondaryLabel" numberOfLines={1}>
                      {lecturer.language || "Scholar"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!query && visibleCount < lecturers.length && (
            <Pressable
              onPress={() => setVisibleCount((count) => count + VISIBLE_SCHOLAR_STEP)}
              style={[styles.moreButton, { borderColor: colors.system.separator.primary }]}
            >
              <Text variant="subheadline" weight="semibold" color="brand">Show more scholars</Text>
            </Pressable>
          )}
        </View>

        {syncError && (
          <Text variant="footnote" style={{ color: colors.semantic.orange, textAlign: "center" }}>
            Your device choices are available; account sync will retry later.
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.system.background.primary, borderTopColor: colors.system.separator.primary }]}> 
        <View>
          <Text variant="caption1" color="secondaryLabel">Selected</Text>
          <Text variant="headline" weight="bold" color="label" style={styles.tabular}>
            {selectionCount} {selectionCount === 1 ? "choice" : "choices"}
          </Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.brand.primary, opacity: pressed || isSaving ? 0.72 : 1 },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.fixed.black} />
          ) : (
            <>
              <Text variant="headline" weight="bold" style={{ color: colors.fixed.black }}>
                {isOnboarding ? "Build my Home" : "Save"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.fixed.black} />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(128,128,128,0.18)", overflow: "hidden" },
  progressFill: { width: "100%", height: "100%" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 30 },
  intro: { alignItems: "center", gap: 10 },
  spark: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  centerText: { textAlign: "center", maxWidth: 390 },
  section: { gap: 14 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { minHeight: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  search: { minHeight: 50, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontSize: 16, minHeight: 48 },
  loadingRow: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 10 },
  scholarGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 20 },
  scholar: { width: "33.333%", alignItems: "center", paddingHorizontal: 5, gap: 5 },
  avatar: { width: 82, height: 82, borderRadius: 41, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  check: { position: "absolute", right: 2, bottom: 2, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  scholarName: { textAlign: "center", minHeight: 32 },
  moreButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footer: { minHeight: 82, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  saveButton: { minWidth: 174, minHeight: 54, paddingHorizontal: 20, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  tabular: { fontVariant: ["tabular-nums"] },
});
