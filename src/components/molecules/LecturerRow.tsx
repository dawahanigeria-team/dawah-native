import React from 'react';
import { Image } from 'expo-image';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import tw from '../../theme/twrnc';
import { useTheme } from '../../hooks/useTheme';
import { getInitials, getPlaceholderColor } from '../../utils/colorPlaceholder';

export interface LecturerRowProps {
  id: string;
  name: string;
  imageUrl?: string;
  state?: string;
  language?: string;
  views?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const formatCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

/**
 * One scholar as a row.
 *
 * The grid has to truncate: two columns on a phone leaves room for about two
 * words, so "Prof. Ibrahim Danjuma" and "Prof. Ibrahim Adewale" both read
 * "Prof. Ibrahim…", which is not a distinction. This screen exists to tell 300+
 * scholars apart, so the list gives the name the full width and adds the state,
 * language and play count the API already returns.
 */
export const LecturerRow: React.FC<LecturerRowProps> = ({
  id,
  name,
  imageUrl,
  state,
  language,
  views,
  onPress,
  style,
}) => {
  const { colors } = useTheme();
  const initials = getInitials(name);
  const placeholderColor = getPlaceholderColor(id);

  const meta = [
    state?.trim() || null,
    language && language !== 'Unknown' ? language : null,
    views && views > 0 ? `${formatCount(views)} plays` : null,
  ].filter(Boolean) as string[];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[tw`flex-row items-center px-4 py-2`, style]}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
      delayPressIn={0}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            tw`w-24 rounded-lg`,
            { aspectRatio: 5 / 3, backgroundColor: colors.system.fill.secondary },
          ]}
          contentFit="cover"
          cachePolicy="disk"
          allowDownscaling
          recyclingKey={`lecturer-row-${id}`}
        />
      ) : (
        <View
          style={[
            tw`w-24 rounded-lg items-center justify-center`,
            { aspectRatio: 5 / 3, backgroundColor: placeholderColor },
          ]}
        >
          <Text style={{ color: colors.fixed.white, fontSize: 18, fontWeight: 'bold' }}>
            {initials}
          </Text>
        </View>
      )}

      <View style={tw`flex-1 ml-3`}>
        <Text
          style={[tw`text-sm font-medium`, { color: colors.system.label.primary }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        {meta.length > 0 && (
          <Text
            style={[tw`text-xs mt-0.5`, { color: colors.system.label.secondary }]}
            numberOfLines={1}
          >
            {meta.join(' · ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
