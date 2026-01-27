import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../src/components/atoms";
import {
  defaultNotificationPrefs,
  disablePushNotificationsAsync,
  getNotificationPrefs,
  getStoredPushToken,
  registerForPushNotificationsAsync,
  setNotificationPrefs,
  syncNotificationPreferencesAsync,
  type NotificationPrefs,
} from "../src/services/notifications.service";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";

const NotificationsScreen = () => {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [loading, setLoading] = useState(true);
  const [pushTokenStatus, setPushTokenStatus] = useState<"present" | "missing">("missing");
  const announcementsForced = true;

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const storedPrefs = await getNotificationPrefs();
        setPrefs(storedPrefs);
        const storedToken = await getStoredPushToken();
        setPushTokenStatus(storedToken ? "present" : "missing");
      } catch (e) {
        console.warn("Failed to load notification prefs", e);
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, []);

  const updatePref = async <K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K]
  ) => {
    const next = {
      ...prefs,
      [key]: key === "announcements" && announcementsForced ? true : value,
    };
    setPrefs(next);
    try {
      await setNotificationPrefs(next);
      if (key === "enabled") {
        if (value) {
          await registerForPushNotificationsAsync();
        } else {
          await disablePushNotificationsAsync();
        }
        const storedToken = await getStoredPushToken();
        setPushTokenStatus(storedToken ? "present" : "missing");
      } else {
        await syncNotificationPreferencesAsync(next);
        const storedToken = await getStoredPushToken();
        setPushTokenStatus(storedToken ? "present" : "missing");
      }
    } catch (e) {
      console.warn("Failed to save notification prefs", e);
    }
  };

  const disabled = !prefs.enabled || loading;

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
    >
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3`}>
        <View style={tw`w-10 h-10 items-center justify-center mr-2`}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={designTokens.colors.system.label.primary}
            onPress={() => router.back()}
          />
        </View>
        <Text
          style={[
            tw`text-2xl font-bold`,
            { color: designTokens.colors.system.label.primary },
          ]}
          accessibilityRole="header"
        >
          Notifications
        </Text>
      </View>

      <View
        style={tw`px-4 pb-4`}
      >
        <Text
          style={[
            tw`text-sm`,
            { color: designTokens.colors.system.label.secondary },
          ]}
        >
          Control how dawahnigeria notifies you about new content and updates.
          You can also turn notifications off entirely.
        </Text>
        <Text
          style={[
            tw`text-xs mt-2`,
            { color: designTokens.colors.system.label.tertiary },
          ]}
        >
          Push token: {pushTokenStatus === "present" ? "registered" : "not registered"}
        </Text>
      </View>

      <View
        style={[
          tw`mx-4 mb-4 rounded-2xl`,
          { backgroundColor: designTokens.colors.system.background.secondary },
        ]}
      >
        <NotificationRow
          title="Allow notifications"
          subtitle="Turn all push notifications on or off"
          value={prefs.enabled}
          onChange={(v) => updatePref("enabled", v)}
        />
      </View>

      <View
        style={[
          tw`mx-4 mb-4 rounded-2xl`,
          { backgroundColor: designTokens.colors.system.background.secondary },
        ]}
      >
        <NotificationRow
          title="New lectures from scholars"
          subtitle="When new lectures are published"
          value={prefs.newLectures}
          onChange={(v) => updatePref("newLectures", v)}
          disabled={disabled}
        />
        <NotificationRow
          title="Updates on favorites"
          subtitle="Activity on lectures and scholars you follow"
          value={prefs.favoritesActivity}
          onChange={(v) => updatePref("favoritesActivity", v)}
          disabled={disabled}
          divider
        />
        <NotificationRow
          title="Downloads complete"
          subtitle="When an offline download finishes"
          value={prefs.downloadsComplete}
          onChange={(v) => updatePref("downloadsComplete", v)}
          disabled={disabled}
          divider
        />
        <NotificationRow
          title="Announcements & tips"
          subtitle="Occasional updates about new features"
          value={announcementsForced || prefs.announcements}
          onChange={(v) => updatePref("announcements", v)}
          disabled={disabled || announcementsForced}
        />
      </View>

      <View style={tw`px-4 mt-auto mb-6`}>
        <Text
          style={[
            tw`text-xs`,
            { color: designTokens.colors.system.label.tertiary },
          ]}
        >
          To fully disable notifications, you may also need to turn them off in
          your device settings.
        </Text>
      </View>
    </SafeAreaView>
  );
};

interface NotificationRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
}

const NotificationRow: React.FC<NotificationRowProps> = ({
  title,
  subtitle,
  value,
  onChange,
  disabled,
  divider,
}) => {
  return (
    <View
      style={[
        tw`flex-row items-center px-4 py-3`,
        divider && {
          borderTopWidth: 1,
          borderTopColor: designTokens.colors.overlay.lightThin,
        },
      ]}
    >
      <View style={tw`flex-1 mr-3`}>
        <Text
          style={[
            tw`text-base font-medium`,
            { color: designTokens.colors.system.label.primary },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              tw`text-xs mt-1`,
              { color: designTokens.colors.system.label.secondary },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        thumbColor={
          value
            ? designTokens.colors.system.background.primary
            : designTokens.colors.system.fill.secondary
        }
        trackColor={{
          true: designTokens.colors.brand.primary,
          false: designTokens.colors.system.fill.quaternary,
        }}
      />
    </View>
  );
};

export default NotificationsScreen;
