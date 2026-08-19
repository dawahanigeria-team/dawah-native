import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../components/atoms";
import { useTheme } from "../hooks/useTheme";
import { type Lecturer, lecturersApi } from "../services/api/lecturers.api";

const FALLBACK_PORTRAITS = ["A", "Y", "H", "E", "N", "I"];

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  useEffect(() => {
    // This enrichment starts after the welcome UI paints. A slow or offline
    // connection never blocks the entry actions.
    const timer = setTimeout(() => {
      void lecturersApi
        .getAllLecturers({ page: 1, lim: 6 })
        .then((response) => setLecturers(response.data.slice(0, 6)))
        .catch(() => undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const goToPreferences = () =>
    router.push({ pathname: "/listening-preferences", params: { onboarding: "true" } } as any);
  const returnTo = "/listening-preferences?onboarding=true";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: "#07110d" }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={[styles.mark, { backgroundColor: colors.brand.primary }]}>
            <Text style={styles.markText}>DN</Text>
          </View>
          <Text variant="title2" weight="bold" style={styles.whiteText}>
            dawahnigeria
          </Text>
        </View>

        <View style={styles.copy}>
          <Text variant="largeTitle" weight="bold" style={styles.title}>
            Knowledge that speaks your language
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Listen to trusted scholars, save lectures, and build a Home shaped around you.
          </Text>
        </View>

        <View accessibilityLabel="Featured scholars" style={styles.portraitGrid}>
          {FALLBACK_PORTRAITS.map((initial, index) => {
            const lecturer = lecturers[index];
            // Several legacy thumbnail records return 404 while the original
            // portrait remains available, so prefer the reliable source.
            const image = lecturer?.img || lecturer?.rp_thumbnail;
            return (
              <View key={`${String(lecturer?.id ?? "fallback")}-${index}`} style={styles.portraitItem}>
                <View style={[styles.portrait, { borderColor: `${colors.brand.primary}70` }]}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={120}
                    />
                  ) : (
                    <Text variant="title1" weight="bold" style={styles.initial}>
                      {initial}
                    </Text>
                  )}
                </View>
                <Text variant="caption2" numberOfLines={1} style={styles.portraitName}>
                  {lecturer?.name || "Scholar"}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push({ pathname: "/sign-up", params: { returnTo } })}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.brand.primary, opacity: pressed ? 0.86 : 1 },
            ]}
            accessibilityRole="button"
          >
            <Text variant="headline" weight="bold" style={styles.buttonText}>
              Create free account
            </Text>
            <Ionicons name="arrow-forward" size={19} color="#07110d" />
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: "/sign-in", params: { returnTo } })}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Text variant="headline" weight="semibold" style={styles.whiteText}>
              Log in
            </Text>
          </Pressable>

          <Pressable onPress={goToPreferences} style={styles.guestButton}>
            <Text variant="subheadline" style={styles.guestText}>
              Continue without an account
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24, gap: 26 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  mark: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  markText: { color: "#07110d", fontSize: 16, fontWeight: "800" },
  copy: { alignItems: "center", gap: 10 },
  title: { color: "#f7fbf8", textAlign: "center", lineHeight: 42, maxWidth: 390 },
  subtitle: { color: "#aebcb5", textAlign: "center", lineHeight: 23, maxWidth: 360 },
  whiteText: { color: "#f7fbf8" },
  portraitGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  portraitItem: { width: "28%", alignItems: "center", gap: 6 },
  portrait: { width: 82, height: 82, borderRadius: 41, overflow: "hidden", borderWidth: 1 },
  initial: { color: "#d9e4de", textAlign: "center", lineHeight: 80 },
  portraitName: { color: "#d9e4de", maxWidth: 92, textAlign: "center" },
  actions: { marginTop: "auto", gap: 10 },
  primaryButton: { minHeight: 56, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  secondaryButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: "#405148", alignItems: "center", justifyContent: "center" },
  guestButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  guestText: { color: "#aebcb5", textDecorationLine: "underline" },
  buttonText: { color: "#07110d" },
});
