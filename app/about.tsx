import Ionicons from "@expo/vector-icons/Ionicons";
import { AppMark } from "../src/components/atoms/AppMark";
import Constants from "expo-constants";
import React from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../src/components/atoms";
import { ScreenHeader } from "../src/components/molecules";
import { useTheme } from "../src/hooks/useTheme";
import tw from "../src/theme/twrnc";

const appVersion = Constants.expoConfig?.version || "1.0.0";
const buildNumber =
  Constants.expoConfig?.ios?.buildNumber ||
  Constants.expoConfig?.android?.versionCode?.toString() ||
  "1";

const AboutScreen = () => {
  const { colors } = useTheme();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[
        tw`flex-1`,
        { backgroundColor: colors.system.background.primary },
      ]}
    >
      <ScreenHeader title="About" />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pb-12`}
        showsVerticalScrollIndicator={false}
      >
        {/* App Icon & Info */}
        <View style={tw`items-center mt-6 mb-8`}>
          <View style={tw`mb-4`}>
            <AppMark size={80} />
          </View>
          <Text
            style={[
              tw`text-xl font-bold mb-1`,
              { color: colors.system.label.primary },
            ]}
          >
            dawahnigeria
          </Text>
          <Text
            style={[
              tw`text-sm`,
              { color: colors.system.label.secondary },
            ]}
          >
            Reviving the Ummah byte by byte
          </Text>
          <Text
            style={[
              tw`text-xs mt-2`,
              { color: colors.system.label.tertiary },
            ]}
          >
            Version {appVersion} ({buildNumber})
          </Text>
        </View>

        {/* About Section */}
        <View
          style={[
            tw`rounded-2xl p-4 mb-6`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <Text
            style={[
              tw`text-sm leading-5`,
              { color: colors.system.label.secondary },
            ]}
          >
            dawahnigeria is your companion for Islamic lectures and knowledge.
            Browse thousands of lectures from renowned scholars, build your
            personal library, and learn on the go with offline downloads and
            background playback.
          </Text>
        </View>

        {/* Links */}
        <View
          style={[
            tw`rounded-2xl overflow-hidden mb-6`,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <LinkRow
            icon="globe-outline"
            title="Website"
            subtitle="dawahnigeria.com"
            onPress={() => openLink("https://dawahnigeria.com")}
            colors={colors}
          />
          <LinkRow
            icon="mail-outline"
            title="Contact Us"
            subtitle="support@dawahnigeria.com"
            onPress={() =>
              openLink("mailto:support@dawahnigeria.com?subject=App%20Inquiry")
            }
            colors={colors}
            divider
          />
          <LinkRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="View our privacy policy"
            onPress={() => openLink("https://dawahnigeria.com/privacy")}
            colors={colors}
            divider
          />
          <LinkRow
            icon="document-text-outline"
            title="Terms of Service"
            subtitle="View terms and conditions"
            onPress={() => openLink("https://dawahnigeria.com/terms")}
            colors={colors}
            divider
          />
        </View>

        {/* Footer */}
        <View style={tw`items-center mt-4`}>
          <Text
            style={[
              tw`text-xs`,
              { color: colors.system.label.tertiary },
            ]}
          >
            Made with care in Nigeria
          </Text>
          <Text
            style={[
              tw`text-xs mt-1`,
              { color: colors.system.label.tertiary },
            ]}
          >
            {new Date().getFullYear()} dawahnigeria. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface LinkRowProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: any;
  divider?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  colors,
  divider,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityLabel={title}
    accessibilityHint={subtitle}
    accessibilityRole="link"
    style={[
      tw`flex-row items-center px-4 py-3`,
      divider && {
        borderTopWidth: 0.5,
        borderTopColor: colors.system.separator.primary,
      },
    ]}
  >
    <Ionicons
      name={icon as keyof typeof Ionicons.glyphMap}
      size={20}
      color={colors.system.label.secondary}
      style={{ marginRight: 12 }}
    />
    <View style={tw`flex-1`}>
      <Text
        style={[
          tw`text-base font-medium`,
          { color: colors.system.label.primary },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[tw`text-xs mt-0.5`, { color: colors.system.label.secondary }]}
      >
        {subtitle}
      </Text>
    </View>
    <Ionicons
      name="chevron-forward"
      size={18}
      color={colors.system.label.tertiary}
    />
  </TouchableOpacity>
);

export default AboutScreen;
