/**
 * Inbox Screen
 * Displays announcements and notifications for users
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../src/components/atoms";
import { useAnnouncements } from "../src/hooks/useAnnouncements";
import { announcementsApi } from "../src/services/api/announcements.api";
import { userService } from "../src/services/user.service";
import { designTokens } from "../src/theme/designTokens";
import tw from "../src/theme/twrnc";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: "announcement" | "update" | "alert";
  icon?: string;
}

// Mock data - replace with actual API call
const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Welcome to DawahNigeria",
    message:
      "Thank you for using DawahNigeria app. We're committed to bringing you the best Islamic content from renowned scholars.",
    createdAt: new Date().toISOString(),
    read: false,
    type: "announcement",
    icon: "megaphone",
  },
  {
    id: "2",
    title: "New Feature: Video Lectures",
    message:
      "We've added video lectures! Click the Video section on the home page to watch inspiring content from our scholars.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    read: false,
    type: "update",
    icon: "videocam",
  },
  {
    id: "3",
    title: "Push Notifications Enabled",
    message:
      "You're now subscribed to announcements and updates. Manage your notification preferences in Settings.",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    read: true,
    type: "announcement",
    icon: "notifications",
  },
];

export default function InboxScreen() {
  const [userId, setUserId] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  // Load user ID for markAsRead callback
  useEffect(() => {
    userService.getUserId().then(setUserId);
  }, []);

  // Fetch announcements using the hook (userId fetched internally)
  const {
    announcements: apiAnnouncements,
    unreadCount: apiUnreadCount,
    loading,
    error,
    refetch,
  } = useAnnouncements();

  // Transform API announcements to local format
  const announcements: Announcement[] = apiAnnouncements.length > 0
    ? apiAnnouncements.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message || item.body || '',
        createdAt: item.created_at,
        read: item.read || false,
        type: (item.type as any) || 'announcement',
        icon: item.icon,
      }))
    : mockAnnouncements; // Fallback to mock data if API returns empty

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      // Fetch userId if we don't have it yet
      const currentUserId = userId || await userService.getUserId();
      await announcementsApi.markAsRead(id, currentUserId);
      // Refetch to update the list
      await refetch();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [userId, refetch]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getIconColor = (type: Announcement["type"]): string => {
    switch (type) {
      case "alert":
        return designTokens.colors.system.red;
      case "update":
        return designTokens.colors.brand.primary;
      default:
        return designTokens.colors.palette.blue500;
    }
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <TouchableOpacity
      style={[
        tw`px-4 py-4`,
        {
          backgroundColor: item.read
            ? designTokens.colors.system.background.primary
            : designTokens.colors.system.background.secondary,
          borderBottomWidth: 1,
          borderBottomColor: designTokens.colors.system.separator.primary,
        },
      ]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row`}>
        {/* Icon */}
        <View
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
            {
              backgroundColor: `${getIconColor(item.type)}20`,
            },
          ]}
        >
          <Ionicons
            name={(item.icon as any) || "mail"}
            size={20}
            color={getIconColor(item.type)}
          />
        </View>

        {/* Content */}
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-start justify-between mb-1`}>
            <Text
              style={[
                tw`flex-1 mr-2`,
                {
                  fontSize: designTokens.typography.fontSize.subheadline,
                  fontWeight: item.read
                    ? designTokens.typography.fontWeight.medium
                    : designTokens.typography.fontWeight.bold,
                  color: designTokens.colors.system.label.primary,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: designTokens.typography.fontSize.caption1,
                color: designTokens.colors.system.label.tertiary,
              }}
            >
              {formatDate(item.createdAt)}
            </Text>
          </View>

          <Text
            style={{
              fontSize: designTokens.typography.fontSize.footnote,
              color: designTokens.colors.system.label.secondary,
              lineHeight: designTokens.typography.fontSize.footnote * 1.4,
            }}
            numberOfLines={2}
          >
            {item.message}
          </Text>

          {/* Unread indicator */}
          {!item.read && (
            <View style={tw`flex-row items-center mt-2`}>
              <View
                style={[
                  tw`w-2 h-2 rounded-full mr-2`,
                  { backgroundColor: designTokens.colors.brand.primary },
                ]}
              />
              <Text
                style={{
                  fontSize: designTokens.typography.fontSize.caption2,
                  color: designTokens.colors.brand.primary,
                  fontWeight: designTokens.typography.fontWeight.semibold,
                }}
              >
                New
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = announcements.filter((a) => !a.read).length;

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
    >
      {/* Header */}
      <View style={tw`px-4 py-3 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-3`}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={designTokens.colors.system.label.primary}
            />
          </TouchableOpacity>
          <View>
            <Text
              style={{
                fontSize: designTokens.typography.fontSize.title2,
                fontWeight: designTokens.typography.fontWeight.bold,
                color: designTokens.colors.system.label.primary,
              }}
            >
              Inbox
            </Text>
            {unreadCount > 0 && (
              <Text
                style={{
                  fontSize: designTokens.typography.fontSize.caption1,
                  color: designTokens.colors.system.label.secondary,
                  marginTop: 2,
                }}
              >
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {/* Settings button */}
        <TouchableOpacity
          onPress={() => router.push("/notifications")}
          style={tw`p-2`}
          accessibilityLabel="Notification settings"
          accessibilityRole="button"
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={designTokens.colors.system.label.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator
            size="large"
            color={designTokens.colors.brand.primary}
          />
          <Text
            style={[
              tw`mt-4`,
              {
                color: designTokens.colors.system.label.secondary,
                fontSize: designTokens.typography.fontSize.body,
              },
            ]}
          >
            Loading announcements...
          </Text>
        </View>
      ) : announcements.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Ionicons
            name="mail-open-outline"
            size={64}
            color={designTokens.colors.system.label.tertiary}
          />
          <Text
            style={[
              tw`mt-4 text-center`,
              {
                fontSize: designTokens.typography.fontSize.title3,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.colors.system.label.primary,
              },
            ]}
          >
            No announcements yet
          </Text>
          <Text
            style={[
              tw`mt-2 text-center`,
              {
                fontSize: designTokens.typography.fontSize.body,
                color: designTokens.colors.system.label.secondary,
              },
            ]}
          >
            We'll notify you when there's something new
          </Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={designTokens.colors.brand.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}
