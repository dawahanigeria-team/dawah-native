import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { designTokens } from '../../src/theme/designTokens';

export default function TabLayout() {
  const handleTabPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: designTokens.colors.brand.primary,
        tabBarInactiveTintColor: designTokens.colors.system.label.tertiary,
        tabBarStyle: {
          backgroundColor: designTokens.colors.system.background.secondary,
          borderTopColor: designTokens.colors.system.separator.primary,
          borderTopWidth: 0.5, // iOS standard separator width
          height: Platform.OS === 'ios' ? 83 : 84, // iOS standard tab bar height
          paddingBottom: Platform.OS === 'ios' ? 20 : 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: designTokens.typography.fontSize.caption1,
          fontWeight: designTokens.typography.fontWeight.medium,
          fontFamily: designTokens.typography.fontFamily.system,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name="search" 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'library' : 'library-outline'} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}
