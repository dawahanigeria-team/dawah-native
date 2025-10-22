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
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import tw from '../../theme/twrnc';
import { designTokens } from '../../theme/designTokens';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const [tabLayouts, setTabLayouts] = useState<{ [key: string]: { x: number; width: number } }>({});
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  // Update indicator position when active tab changes
  useEffect(() => {
    const layout = tabLayouts[activeTab];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorPosition, {
          toValue: layout.x,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }),
      ]).start();
    }
  }, [activeTab, tabLayouts]);

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
    <View style={[tw`border-b border-gray-800`, style]}>
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
                          ? designTokens.colors.system.label.primary
                          : designTokens.colors.system.label.tertiary,
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
                            ? designTokens.colors.system.label.secondary
                            : designTokens.colors.system.label.quaternary,
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
              {
                backgroundColor: designTokens.colors.brand.primary,
                left: indicatorPosition,
                width: indicatorWidth,
              },
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
};
