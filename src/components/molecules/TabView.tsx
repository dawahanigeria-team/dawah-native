/**
 * TabView Component
 * iOS-style horizontal tab navigation with animated indicator
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import tw from '../../theme/twrnc';
import { designTokens } from '../../theme/designTokens';
import { useThemeColors } from '../../hooks/useTheme';

export interface Tab {
  key: string;
  title: string;
  count?: number;
}

export interface TabViewProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const TabView: React.FC<TabViewProps> = ({
  tabs,
  activeTab,
  onTabChange,
  style,
}) => {
  // designTokens.colors is the deprecated static palette and is always the dark
  // one, so tab labels stayed white and vanished against a light background.
  // The bottom border was likewise a hardcoded gray-800, which read as a hard
  // black rule under the tabs in light mode.
  const colors = useThemeColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const [tabLayouts, setTabLayouts] = useState<{ [key: string]: { x: number; width: number } }>({});
  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Update indicator position when active tab changes
  useEffect(() => {
    const layout = tabLayouts[activeTab];
    if (layout) {
      indicatorPosition.value = withTiming(layout.x, { duration: 180 });
      indicatorWidth.value = withTiming(layout.width, { duration: 180 });
    }
  }, [activeTab, tabLayouts, indicatorPosition, indicatorWidth]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    left: indicatorPosition.value,
    width: indicatorWidth.value,
  }));

  const handleTabPress = (tab: Tab) => {
    onTabChange(tab.key);
  };

  const handleTabLayout = (key: string, event: any) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts(prev => ({
      ...prev,
      [key]: { x, width },
    }));
  };

  return (
    <View
      style={[
        tw`border-b`,
        { borderBottomColor: colors.system.separator.opaque },
        style,
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-5`}
      >
        <View style={tw`flex-row relative`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabPress(tab)}
                onLayout={(event) => handleTabLayout(tab.key, event)}
                style={tw`py-3 px-4 mr-6`}
                activeOpacity={0.7}
              >
                <View style={tw`flex-row items-center`}>
                  <Text
                    style={[
                      tw`font-semibold`,
                      {
                        fontSize: designTokens.typography.fontSize.body,
                        color: isActive
                          ? colors.system.label.primary
                          : colors.system.label.tertiary,
                      },
                    ]}
                  >
                    {tab.title}
                  </Text>
                  {tab.count !== undefined && (
                    <Text
                      style={[
                        tw`ml-1.5`,
                        {
                          fontSize: designTokens.typography.fontSize.caption1,
                          color: isActive
                            ? colors.system.label.secondary
                            : colors.system.label.quaternary,
                        },
                      ]}
                    >
                      ({tab.count})
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Animated indicator */}
          <Animated.View
            style={[
              tw`absolute bottom-0 h-0.5`,
              indicatorAnimatedStyle,
              {
                backgroundColor: colors.brand.primary,
              },
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
};
