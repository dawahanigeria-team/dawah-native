import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../theme/twrnc';
import { designTokens } from '../../theme/designTokens';
import { getInitials, getPlaceholderColor } from '../../utils/colorPlaceholder';

export interface LecturerCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  totalLectures?: number;
  followers?: number;
  language?: string;
  verified?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LecturerCard: React.FC<LecturerCardProps> = ({
  id,
  name,
  imageUrl,
  totalLectures = 0,
  followers = 0,
  language,
  verified = false,
  onPress,
  style,
}) => {
  const initials = getInitials(name);
  const placeholderColor = getPlaceholderColor(id);

  const handlePress = () => {
    console.log('LecturerCard pressed:', name, id);
    if (onPress) {
      onPress();
    } else {
      console.log('No onPress handler provided');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[tw`items-center mr-6`, style]}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      delayPressIn={0}
    >
      {/* Avatar */}
      <View style={tw`relative mb-2`} pointerEvents="box-none">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              tw`w-20 h-20 rounded-full`,
              { backgroundColor: designTokens.colors.system.fill.secondary }
            ]}
          />
        ) : (
          <View
            style={[
              tw`w-20 h-20 rounded-full items-center justify-center`,
              { backgroundColor: placeholderColor }
            ]}
          >
            <Text style={tw`text-white text-2xl font-bold`}>
              {initials}
            </Text>
          </View>
        )}

        {/* Verified Badge */}
        {verified && (
          <View
            style={[
              tw`absolute bottom-0 right-0 w-6 h-6 rounded-full items-center justify-center`,
              { backgroundColor: designTokens.colors.brand.primary }
            ]}
          >
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={[
          tw`text-xs font-medium text-center mb-1`,
          { color: designTokens.colors.system.label.primary }
        ]}
        numberOfLines={2}
        pointerEvents="none"
      >
        {name}
      </Text>

      {/* Language Badge */}
      {language && (
        <View
          style={[
            tw`px-2 py-0.5 rounded-full mb-1`,
            { backgroundColor: designTokens.colors.system.fill.tertiary }
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              tw`text-xs`,
              { color: designTokens.colors.system.label.secondary }
            ]}
          >
            {language}
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={tw`flex-row items-center`} pointerEvents="none">
        {totalLectures > 0 && (
          <>
            <Text
              style={[
                tw`text-xs`,
                { color: designTokens.colors.system.label.secondary }
              ]}
            >
              {totalLectures} lectures
            </Text>
          </>
        )}
        {followers > 0 && (
          <>
            {totalLectures > 0 && (
              <Text
                style={[
                  tw`mx-1 text-xs`,
                  { color: designTokens.colors.system.label.tertiary }
                ]}
              >
                •
              </Text>
            )}
            <Text
              style={[
                tw`text-xs`,
                { color: designTokens.colors.system.label.secondary }
              ]}
            >
              {formatNumber(followers)} views
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};
