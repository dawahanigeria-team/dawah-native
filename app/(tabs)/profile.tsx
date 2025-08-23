import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../src/theme/twrnc';
import { useThemeStore } from '../../src/stores/themeStore';

interface SettingItem {
  id: string;
  title: string;
  icon: string;
  subtitle?: string;
  onPress: () => void;
}

const settingsItems: SettingItem[] = [
  {
    id: '1',
    title: 'Appearance',
    icon: 'color-palette-outline',
    subtitle: 'Dark mode, theme settings',
    onPress: () => console.log('Appearance pressed'),
  },
  {
    id: '2',
    title: 'Notifications',
    icon: 'notifications-outline',
    subtitle: 'Push notifications, alerts',
    onPress: () => console.log('Notifications pressed'),
  },
  {
    id: '3',
    title: 'Playback',
    icon: 'play-circle-outline',
    subtitle: 'Audio quality, speed',
    onPress: () => console.log('Playback pressed'),
  },
  {
    id: '4',
    title: 'About',
    icon: 'information-circle-outline',
    subtitle: 'App version, terms',
    onPress: () => console.log('About pressed'),
  },
];

export default function ProfileScreen() {
  const { isDark, toggleTheme } = useThemeStore();

  const handleSignIn = () => {
    console.log('Sign in pressed');
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#0A0A0F]`}>
      {/* Header */}
      <View style={tw`px-4 py-3`}>
        <Text style={tw`text-white text-2xl font-bold`}>
          Profile
        </Text>
      </View>

      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-24`}
      >
        {/* Identity Card */}
        <View style={tw`px-4 mb-6`}>
          <View style={tw`bg-card rounded-3xl p-6 items-center`}>
            <View style={tw`w-20 h-20 bg-[#C6FF00] rounded-full items-center justify-center mb-4`}>
              <Ionicons name="person" size={40} color="#0B0B0F" />
            </View>
            
            <Text style={tw`text-white text-xl font-bold mb-2`}>
              Guest User
            </Text>
            
            <Text style={tw`text-[#8B8CA1] text-center mb-4`}>
              Sign in to sync your library and preferences across devices
            </Text>
            
            <TouchableOpacity
              style={tw`bg-[#C6FF00] px-6 py-3 rounded-full`}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <Text style={tw`text-bg font-semibold text-base`}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings List */}
        <View style={tw`px-4`}>
          <Text style={tw`text-white text-lg font-semibold mb-4`}>
            Settings
          </Text>
          
          <View style={tw`bg-card rounded-2xl overflow-hidden`}>
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  tw`flex-row items-center p-4`,
                  index < settingsItems.length - 1 && tw`border-b border-[rgba(255,255,255,0.08)]`
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View 
                  style={tw`w-10 h-10 bg-[#2A2A2F] rounded-full items-center justify-center mr-4`}
                >
                  <Ionicons name={item.icon as any} size={20} color="#8B8CA1" />
                </View>
                
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white text-base font-medium`}>
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text style={tw`text-[#8B8CA1] text-sm mt-1`}>
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                
                <Ionicons name="chevron-forward" size={20} color="#8B8CA1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme Toggle */}
        <View style={tw`px-4 mt-6`}>
          <View style={tw`bg-card rounded-2xl p-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center`}>
                <View 
                  style={tw`w-10 h-10 bg-[#2A2A2F] rounded-full items-center justify-center mr-4`}
                >
                  <Ionicons 
                    name={isDark ? 'moon' : 'sunny'} 
                    size={20} 
                    color="#8B8CA1" 
                  />
                </View>
                
                <View>
                  <Text style={tw`text-white text-base font-medium`}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                  <Text style={tw`text-[#8B8CA1] text-sm mt-1`}>
                    {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  tw`w-12 h-6 rounded-full p-0.5`,
                  isDark ? tw`bg-[#C6FF00]` : tw`bg-[#8B8CA1]/30`
                ]}
                onPress={handleThemeToggle}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    tw`w-5 h-5 bg-white rounded-full`,
                    isDark && tw`ml-6`
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={tw`px-4 mt-6`}>
          <View style={tw`bg-card rounded-2xl p-4 items-center`}>
            <View style={tw`w-12 h-12 bg-[#C6FF00] rounded-xl items-center justify-center mb-3`}>
              <Text style={tw`text-bg font-bold text-lg`}>DN</Text>
            </View>
            
            <Text style={tw`text-white text-lg font-bold mb-1`}>
              Dawah Nigeria
            </Text>
            
            <Text style={tw`text-[#8B8CA1] text-sm`}>
              Version 1.0.0
            </Text>
            
            <Text style={tw`text-[#8B8CA1] text-xs text-center mt-2`}>
              Islamic content platform for Nigeria
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
