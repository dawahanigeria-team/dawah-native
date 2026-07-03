import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../src/components/atoms";
import ReminderTimePickerModal from "../src/components/molecules/ReminderTimePickerModal";
import { useTheme } from "../src/hooks/useTheme";
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
import {
  updateReligiousReminder,
  type ReminderSetting,
  type ReminderType,
} from "../src/services/religiousReminderPreferences";
import tw from "../src/theme/twrnc";

const NotificationsScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    defaultNotificationPrefs,
  );
  const [loading, setLoading] = useState(true);
  const [pushTokenStatus, setPushTokenStatus] = useState<"present" | "missing">(
    "missing",
  );
  const [activeTimePicker, setActiveTimePicker] = useState<ReminderType | null>(
    null,
  );
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
    value: NotificationPrefs[K],
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
            await disablePushNotificationsAsync(next);
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
  const reminderChildrenDisabled = disabled || !prefs.religiousReminders.enabled;

  const updateReminder = (
    type: ReminderType,
    patch: Partial<ReminderSetting>,
  ) => {
    void updatePref(
      "religiousReminders",
      updateReligiousReminder(prefs.religiousReminders, type, patch),
    );
  };

  const setReligiousRemindersEnabled = (enabled: boolean) => {
    void updatePref("religiousReminders", {
      ...prefs.religiousReminders,
      enabled,
      customized: true,
    });
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={tw`flex-row items-center px-4 py-3`}>
          <View style={tw`w-10 h-10 items-center justify-center mr-2`}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.system.label.primary}
              onPress={() => router.back()}
            />
          </View>
          <Text
            style={[
              tw`text-2xl font-bold`,
              { color: colors.system.label.primary },
            ]}
            accessibilityRole="header"
          >
            Notifications
          </Text>
        </View>

        <View style={tw`px-4 pb-4`}>
          <Text style={[tw`text-sm`, { color: colors.system.label.secondary }]}>
            Control how dawahnigeria notifies you about new content and updates.
            You can also turn notifications off entirely.
          </Text>
          <Text
            style={[tw`text-xs mt-2`, { color: colors.system.label.tertiary }]}
          >
            Push token:{" "}
            {pushTokenStatus === "present" ? "registered" : "not registered"}
          </Text>
        </View>

        <View
          style={[
            tw`mx-4 mb-4 rounded-2xl`,
            { backgroundColor: colors.system.background.secondary },
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
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <NotificationRow
            title="Updates on favorites"
            subtitle="Activity on lectures and scholars you follow"
            value={prefs.favoritesActivity}
            onChange={(v) => updatePref("favoritesActivity", v)}
            disabled={disabled}
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
            divider
          />
        </View>

        <View style={tw`px-4 mb-2`}>
          <Text variant="headline" weight="bold">Religious reminders</Text>
          <Text style={[tw`text-xs mt-1`, { color: colors.system.label.secondary }]}>
            Defaults use West Africa Time. Your device timezone is used after you
            customize a reminder.
          </Text>
        </View>

        <View
          style={[
            tw`mx-4 mb-4 rounded-2xl`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <NotificationRow
            title="Religious reminders"
            subtitle="Friday reading and voluntary fasting reminders"
            value={prefs.religiousReminders.enabled}
            onChange={setReligiousRemindersEnabled}
            disabled={disabled}
          />
          <ReminderRow
            title="Surah Al-Kahf — Friday"
            setting={prefs.religiousReminders.surahAlKahf}
            onToggle={(enabled) => updateReminder("surahAlKahf", { enabled })}
            onPressTime={() => setActiveTimePicker("surahAlKahf")}
            disabled={reminderChildrenDisabled}
            divider
          />
          <ReminderRow
            title="Monday fast — remind me Sunday"
            setting={prefs.religiousReminders.mondayFast}
            onToggle={(enabled) => updateReminder("mondayFast", { enabled })}
            onPressTime={() => setActiveTimePicker("mondayFast")}
            disabled={reminderChildrenDisabled}
            divider
          />
          <ReminderRow
            title="Thursday fast — remind me Wednesday"
            setting={prefs.religiousReminders.thursdayFast}
            onToggle={(enabled) => updateReminder("thursdayFast", { enabled })}
            onPressTime={() => setActiveTimePicker("thursdayFast")}
            disabled={reminderChildrenDisabled}
            divider
          />
        </View>

        <View style={tw`px-4 mt-auto mb-6`}>
          <Text style={[tw`text-xs`, { color: colors.system.label.tertiary }]}>
            To fully disable notifications, you may also need to turn them off in
            your device settings.
          </Text>
        </View>
      </ScrollView>

      <ReminderTimePickerModal
        visible={activeTimePicker !== null}
        title="Choose reminder time"
        value={activeTimePicker
          ? prefs.religiousReminders[activeTimePicker].time
          : "07:00"}
        onCancel={() => setActiveTimePicker(null)}
        onConfirm={(time) => {
          if (activeTimePicker) {
            updateReminder(activeTimePicker, { time });
          }
          setActiveTimePicker(null);
        }}
      />
    </SafeAreaView>
  );
};

interface ReminderRowProps {
  title: string;
  setting: ReminderSetting;
  onToggle: (enabled: boolean) => void;
  onPressTime: () => void;
  disabled?: boolean;
  divider?: boolean;
}

const ReminderRow: React.FC<ReminderRowProps> = ({
  title,
  setting,
  onToggle,
  onPressTime,
  disabled,
  divider,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        tw`px-4 py-3`,
        divider && [
          styles.rowDivider,
          { borderTopColor: colors.system.separator.primary },
        ],
      ]}
    >
      <View style={tw`flex-row items-center`}>
        <Text style={[tw`text-base font-medium flex-1 mr-3`, { color: colors.system.label.primary }]}>
          {title}
        </Text>
        <Switch
          value={setting.enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ true: colors.brand.primary, false: colors.system.fill.quaternary }}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} reminder time ${setting.time}`}
        disabled={disabled || !setting.enabled}
        onPress={onPressTime}
        style={styles.timeButton}
      >
        <Ionicons name="time-outline" size={18} color={colors.brand.primary} />
        <Text weight="semibold" style={{ color: colors.brand.primary }}>
          {setting.time}
        </Text>
      </Pressable>
    </View>
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
  const { colors } = useTheme();

  return (
    <View
      style={[
        tw`flex-row items-center px-4 py-3`,
        divider && [
          styles.rowDivider,
          { borderTopColor: colors.system.separator.primary },
        ],
      ]}
    >
      <View style={tw`flex-1 mr-3`}>
        <Text
          style={[
            tw`text-base font-medium`,
            { color: colors.system.label.primary },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[tw`text-xs mt-1`, { color: colors.system.label.secondary }]}
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
            ? colors.system.background.primary
            : colors.system.fill.secondary
        }
        trackColor={{
          true: colors.brand.primary,
          false: colors.system.fill.quaternary,
        }}
      />
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
});
