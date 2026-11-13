import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/atoms/Text';
import { useTheme } from '../../hooks/useTheme';
import tw from '../../theme/twrnc';
import { LecturerAbout, LecturerAboutFact, lecturerAboutFacts } from './lecturerAbout';

const FACT_ICONS: Record<LecturerAboutFact['key'], keyof typeof Ionicons.glyphMap> = {
  lectures: 'headset-outline',
  albums: 'albums-outline',
  plays: 'play-circle-outline',
  latestUpload: 'calendar-outline',
};

type Props = {
  about: LecturerAbout;
  visible: boolean;
  onClose: () => void;
};

export function LecturerAboutSheet({ about, visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const origin = [about.place, about.language].filter(Boolean).join(' · ');
  const facts = lecturerAboutFacts(about);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessible={false}
        style={[tw`flex-1 justify-end`, { backgroundColor: colors.overlay.darkMedium }]}
        onPress={onClose}
      >
        <Pressable
          accessibilityViewIsModal
          style={[
            tw`rounded-t-3xl px-5 pt-6`,
            {
              backgroundColor: colors.system.background.secondary,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          onPress={() => {}}
        >
          <Text
            accessibilityRole="header"
            style={[tw`text-xl font-bold`, { color: colors.system.label.primary }]}
          >
            {about.fullName}
          </Text>

          {about.isLate && (
            <Text style={[tw`text-sm mt-1`, { color: colors.system.label.secondary }]}>
              Late scholar, may Allah have mercy on him
            </Text>
          )}

          {origin !== '' && (
            <Text style={[tw`text-sm mt-1`, { color: colors.system.label.secondary }]}>
              {origin}
            </Text>
          )}

          {facts.length > 0 && (
            <View style={tw`mt-4`}>
              {facts.map((fact) => (
                <View key={fact.key} style={tw`flex-row items-center py-2`}>
                  <Ionicons
                    name={FACT_ICONS[fact.key]}
                    size={20}
                    color={colors.system.label.tertiary}
                    style={tw`mr-3`}
                  />
                  <Text style={[tw`text-base`, { color: colors.system.label.primary }]}>
                    {fact.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[
              tw`mt-5 min-h-[44px] rounded-full items-center justify-center`,
              styles.outlined,
              { borderColor: colors.system.separator.primary },
            ]}
          >
            <Text style={[tw`text-base font-semibold`, { color: colors.system.label.primary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outlined: {
    borderWidth: 1.5,
  },
});
