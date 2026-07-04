import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ErrorCode, deepLinkToSubscriptions, type ProductSubscription, type Purchase, useIAP } from "expo-iap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Text } from "../src/components/atoms";
import { ENV } from "../src/config/env";
import { useTheme } from "../src/hooks/useTheme";
import { addSentryBreadcrumb } from "../src/services/config/sentry.config";
import { useAuthStore, usePremiumStore } from "../src/stores";
import tw from "../src/theme/twrnc";
import { logger } from "../src/utils/logger";

const PREMIUM_PRODUCT_IDS = [
  ENV.PREMIUM_MONTHLY_PRODUCT_ID,
  ENV.PREMIUM_YEARLY_PRODUCT_ID,
].filter(Boolean);

const isPurchased = (purchase: Purchase): boolean =>
  purchase.purchaseState === "purchased" && !("isSuspendedAndroid" in purchase && purchase.isSuspendedAndroid);

const getPurchasePayload = (purchase: Purchase) => ({
  productId: purchase.productId,
  purchaseToken: purchase.purchaseToken ?? undefined,
  transactionId: "transactionId" in purchase ? purchase.transactionId ?? purchase.id : purchase.id,
  originalTransactionId:
    "originalTransactionIdentifierIOS" in purchase
      ? purchase.originalTransactionIdentifierIOS ?? undefined
      : undefined,
  packageName:
    "packageNameAndroid" in purchase ? purchase.packageNameAndroid ?? undefined : undefined,
  environment:
    "environmentIOS" in purchase ? purchase.environmentIOS ?? undefined : undefined,
  receipt: purchase.purchaseToken ?? undefined,
});

const formatIapError = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message ?? String(error);
  return code ? `${code}: ${message}` : message;
};

export default function PremiumScreen() {
  const router = useRouter();
  const { colors, spacing, borderRadius } = useTheme();
  const { isAuthenticated, user } = useAuthStore();
  const {
    plan,
    subscription_status,
    feature_flags,
    isLoading,
    refreshPremiumFeatures,
    syncPlatformReceipt,
  } = usePremiumStore();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const syncedPurchaseIdsRef = useRef(new Set<string>());
  const [productLoadError, setProductLoadError] = useState<string | null>(null);
  const [lastIapError, setLastIapError] = useState<string | null>(null);

  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    getActiveSubscriptions,
    reconnect,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (!isPurchased(purchase)) {
        return;
      }

      let snapshot: Awaited<ReturnType<typeof syncPlatformReceipt>> | null = null;
      try {
        snapshot = await syncPlatformReceipt(getPurchasePayload(purchase));
      } catch (error: unknown) {
        logger.error("Premium receipt sync failed", error, {
          productId: purchase.productId,
        });
        Alert.alert(
          "Subscription sync failed",
          (error as { message?: string })?.message ||
            "Your purchase completed, but activation failed. Use Restore Purchase to try again.",
        );
      }

      if (snapshot) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (error: unknown) {
          // Sync succeeded server-side, so entitlement state is authoritative.
          // Transaction will be redelivered next launch and we'll finish it then.
          logger.warn("finishTransaction failed after successful sync", error);
        }

        // A valid receipt may still be expired/cancelled — server returns
        // success:true with plan:"free". Don't claim activation in that case.
        if (snapshot.plan === "premium") {
          Alert.alert("Premium activated", "Your subscription is now active.");
        } else {
          Alert.alert(
            "Subscription not active",
            `This receipt is valid but the subscription is ${String(
              snapshot.subscription_status,
            ).replace(/_/g, " ")}. You can resubscribe below.`,
          );
        }
      }

      setSelectedProductId(null);
    },
    onPurchaseError: (error) => {
      setSelectedProductId(null);
      if (error.code === ErrorCode.UserCancelled) {
        return;
      }
      Alert.alert("Purchase failed", error.message || "Please try again.");
    },
    onError: (error) => {
      logger.warn("IAP error:", error);
      setLastIapError(formatIapError(error));
    },
  });

  const sortedSubscriptions = useMemo(() => {
    const productOrder = new Map(PREMIUM_PRODUCT_IDS.map((id, index) => [id, index]));
    return [...subscriptions].sort((a, b) => {
      return (productOrder.get(a.id) ?? 99) - (productOrder.get(b.id) ?? 99);
    });
  }, [subscriptions]);

  const activeSubscriptionSku = useMemo(() => {
    return activeSubscriptions.find((sub) => sub.isActive)?.productId;
  }, [activeSubscriptions]);

  const activeFeatureLabels = useMemo(() => {
    return [
      ["Premium audio", feature_flags.premium_audio],
      ["Offline downloads", feature_flags.offline_download],
      ["Ad-free listening", feature_flags.ad_free],
      ["Background play", feature_flags.background_play],
      ["Follow more lecturers", feature_flags.multi_lecturer_follow],
    ].filter(([, enabled]) => enabled) as [string, boolean][];
  }, [feature_flags]);

  // Surfaced only when products fail to load, so a real "billing unavailable"
  // can be told apart from an empty product list (IDs/state/build-origin issue).
  const iapDiagnostics = useMemo(() => {
    return [
      `Store connected: ${connected ? "yes" : "no"}`,
      `Platform: ${Platform.OS}`,
      `Requested (${PREMIUM_PRODUCT_IDS.length}): ${PREMIUM_PRODUCT_IDS.join(", ")}`,
      `Products returned: ${subscriptions.length}`,
      lastIapError ? `Connection error: ${lastIapError}` : null,
      productLoadError
        ? `Fetch error: ${productLoadError}`
        : connected && subscriptions.length === 0
          ? "Fetch error: none — store returned an empty list (product IDs not found, not approved, or app not installed from the store)"
          : null,
    ].filter(Boolean) as string[];
  }, [connected, subscriptions.length, lastIapError, productLoadError]);

  const showIapDiagnostics =
    (connected && subscriptions.length === 0) || !!productLoadError || !!lastIapError;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace({
        pathname: "/sign-in",
        params: { returnTo: "/premium" },
      });
      return;
    }

    refreshPremiumFeatures().catch((error) => {
      addSentryBreadcrumb("Premium features refresh failed", "premium", {
        message: (error as { message?: string })?.message,
      });
    });
  }, [isAuthenticated, refreshPremiumFeatures, router]);

  useEffect(() => {
    if (!connected || PREMIUM_PRODUCT_IDS.length === 0) return;
    setProductLoadError(null);
    fetchProducts({ skus: PREMIUM_PRODUCT_IDS, type: "subs" }).catch((error) => {
      setProductLoadError(formatIapError(error));
      logger.warn("Failed to fetch subscription products", error);
    });
    getActiveSubscriptions(PREMIUM_PRODUCT_IDS).catch((error) => {
      logger.warn("Failed to fetch active subscriptions", error);
    });
  }, [connected, fetchProducts, getActiveSubscriptions]);

  useEffect(() => {
    if (!isRestoring || availablePurchases.length === 0) return;

    const syncRestoredPurchases = async () => {
      const restored = availablePurchases.filter(isPurchased);
      if (restored.length === 0) {
        setIsRestoring(false);
        Alert.alert("No subscription found", "No active subscription was found for this store account.");
        return;
      }

      try {
        let lastSnapshot: Awaited<ReturnType<typeof syncPlatformReceipt>> | null = null;
        for (const purchase of restored) {
          const syncKey = purchase.transactionId ?? purchase.id;
          if (syncedPurchaseIdsRef.current.has(syncKey)) continue;
          lastSnapshot = await syncPlatformReceipt(getPurchasePayload(purchase));
          // Only mark synced after success so a failure can be retried.
          syncedPurchaseIdsRef.current.add(syncKey);
        }
        if (lastSnapshot && lastSnapshot.plan === "premium") {
          Alert.alert("Subscription restored", "Your premium status has been refreshed.");
        } else {
          Alert.alert(
            "No active subscription",
            "Your receipts were valid but no subscription is currently active.",
          );
        }
      } catch (error: unknown) {
        logger.error("Premium restore failed", error);
        Alert.alert(
          "Restore failed",
          (error as { message?: string })?.message || "Please try again.",
        );
      } finally {
        setIsRestoring(false);
      }
    };

    void syncRestoredPurchases();
  }, [availablePurchases, isRestoring, syncPlatformReceipt]);

  const handleSubscribe = useCallback(
    async (subscription: ProductSubscription) => {
      if (!connected) {
        const didReconnect = await reconnect();
        if (!didReconnect) {
          Alert.alert("Store unavailable", "Please try again in a moment.");
          return;
        }
      }

      setSelectedProductId(subscription.id);

      try {
        const androidOffers =
          subscription.subscriptionOffers
            ?.filter((offer) => Boolean(offer.offerTokenAndroid))
            .map((offer) => ({
              sku: subscription.id,
              offerToken: offer.offerTokenAndroid!,
            })) ?? [];

        await requestPurchase({
          type: "subs",
          request: {
            apple: { sku: subscription.id },
            google: {
              skus: [subscription.id],
              obfuscatedAccountId: user?.id,
              subscriptionOffers: androidOffers,
            },
          },
        });
      } catch (error: unknown) {
        setSelectedProductId(null);
        Alert.alert(
          "Purchase failed",
          (error as { message?: string })?.message || "Please try again.",
        );
      }
    },
    [connected, reconnect, requestPurchase, user?.id],
  );

  const handleRestore = useCallback(async () => {
    // Reset dedupe set so a previously-failed sync can be retried.
    syncedPurchaseIdsRef.current.clear();
    setIsRestoring(true);
    try {
      await getAvailablePurchases({ includeSuspendedAndroid: false });
    } catch (error: unknown) {
      setIsRestoring(false);
      Alert.alert(
        "Restore failed",
        (error as { message?: string })?.message || "Please try again.",
      );
    }
  }, [getAvailablePurchases]);

  const handleManageSubscription = useCallback(() => {
    // Prefer the SKU the user actually subscribed to (from the store),
    // then any in-flight purchase, then the monthly default.
    const skuAndroid =
      activeSubscriptionSku ?? selectedProductId ?? ENV.PREMIUM_MONTHLY_PRODUCT_ID;
    const packageNameAndroid =
      Constants.expoConfig?.android?.package ?? "com.dawahnigeria.app";

    deepLinkToSubscriptions({
      skuAndroid,
      packageNameAndroid,
    }).catch(() => {
      Alert.alert(
        "Unable to open subscriptions",
        "Please open your store account subscription settings.",
      );
    });
  }, [activeSubscriptionSku, selectedProductId]);

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <View style={tw`flex-row items-center px-4 py-3`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 items-center justify-center mr-2`}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.system.label.primary} />
        </TouchableOpacity>
        <Text variant="title2" color="label" weight="bold">
          Premium
        </Text>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() =>
              refreshPremiumFeatures().catch((error) => {
                addSentryBreadcrumb("Premium features refresh failed", "premium", {
                  message: (error as { message?: string })?.message,
                });
              })
            }
            tintColor={colors.brand.primary}
          />
        }
      >
        <View
          style={[
            tw`p-5 mb-5`,
            {
              borderRadius: borderRadius.xl,
              backgroundColor: colors.system.background.secondary,
            },
          ]}
        >
          <Text variant="caption1" color="secondaryLabel" weight="semibold">
            Current plan
          </Text>
          <Text variant="title1" color="label" weight="bold" style={tw`mt-1`}>
            {String(plan).toUpperCase()}
          </Text>
          <Text variant="subheadline" color="secondaryLabel" style={tw`mt-1`}>
            Status: {String(subscription_status).replace(/_/g, " ")}
          </Text>

          {activeFeatureLabels.length > 0 && (
            <View style={tw`mt-4`}>
              {activeFeatureLabels.map(([label]) => (
                <View key={label} style={tw`flex-row items-center mt-2`}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.brand.primary} />
                  <Text variant="subheadline" color="label" style={tw`ml-2`}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text variant="headline" color="label" weight="bold" style={tw`mb-3`}>
          Choose a plan
        </Text>

        {!connected && (
          <View style={tw`flex-row items-center mb-3`}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
            <Text variant="subheadline" color="secondaryLabel" style={tw`ml-2`}>
              Connecting to {Platform.OS === "ios" ? "App Store" : "Google Play"}...
            </Text>
          </View>
        )}

        {connected && sortedSubscriptions.length === 0 && (
          <View
            style={[
              tw`p-4 mb-4`,
              {
                borderRadius: borderRadius.lg,
                backgroundColor: colors.system.background.secondary,
              },
            ]}
          >
            <Text variant="subheadline" color="secondaryLabel">
              No subscription products are available yet. Confirm the store product IDs match:
              {"\n"}
              {PREMIUM_PRODUCT_IDS.join("\n")}
            </Text>
          </View>
        )}

        {showIapDiagnostics && (
          <View
            style={[
              tw`p-4 mb-4`,
              {
                borderRadius: borderRadius.lg,
                borderWidth: 1,
                borderColor: colors.system.separator.primary,
                backgroundColor: colors.system.background.secondary,
              },
            ]}
          >
            <Text variant="caption1" color="secondaryLabel" weight="semibold" style={tw`mb-2`}>
              IAP diagnostics
            </Text>
            {iapDiagnostics.map((line) => (
              <Text key={line} variant="caption1" color="secondaryLabel" selectable style={tw`mb-1`}>
                {line}
              </Text>
            ))}
          </View>
        )}

        {sortedSubscriptions.map((subscription) => {
          // Spin while the user is purchasing or while we're syncing
          // the resulting receipt for this specific card.
          const isBuying = selectedProductId === subscription.id;
          return (
            <TouchableOpacity
              key={subscription.id}
              onPress={() => void handleSubscribe(subscription)}
              disabled={isBuying}
              style={[
                tw`p-4 mb-3`,
                {
                  borderRadius: borderRadius.xl,
                  backgroundColor: colors.system.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.system.separator.primary,
                  opacity: isBuying ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Subscribe to ${subscription.title}`}
            >
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text variant="headline" color="label" weight="bold">
                    {subscription.title}
                  </Text>
                  <Text variant="subheadline" color="secondaryLabel" style={tw`mt-1`}>
                    {subscription.description}
                  </Text>
                </View>
                {isBuying ? (
                  <ActivityIndicator color={colors.brand.primary} />
                ) : (
                  <Text variant="headline" color="brand" weight="bold">
                    {subscription.displayPrice}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={tw`mt-4`}>
          <Button
            variant="plain"
            size="large"
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? "Restoring..." : "Restore Purchase"}
          </Button>
          <Button
            variant="plain"
            size="large"
            style={tw`mt-2`}
            onPress={handleManageSubscription}
          >
            Manage Subscription
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
