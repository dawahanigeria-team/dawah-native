import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/atoms';
import { CardSkeleton } from '../src/components/molecules';
import { ApiError } from '../src/services/api/base.api';
import { playlistApi } from '../src/services/api/playlist.api';
import { useAuthStore } from '../src/stores/authStore';
import { designTokens } from '../src/theme/designTokens';
import { UserPlaylist } from '../src/types/api.types';



export default function PlaylistsScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const fetchPlaylists = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await playlistApi.getUserPlaylists();
      if (response.success && response.playlists) {
        setPlaylists(response.playlists);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch playlists.');
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
      let errorMessage = 'An unexpected error occurred while fetching playlists.';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleCreatePlaylist = async () => {
    if (newPlaylistName.trim() === '') {
      return;
    }

    try {
      const response = await playlistApi.createPlaylist(newPlaylistName, false);
      if (response.playlist_id || (response.data && (response.data.id || response.data.nid))) {
        const newPlaylist: UserPlaylist = {
          id: String(response.playlist_id || response.data?.id || response.data?.nid),
          name: newPlaylistName,
          count: 0,
          is_private: '0',
          user_id: user?.id || '', // Updated with actual user_id
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setPlaylists([newPlaylist, ...playlists]);
        setNewPlaylistName('');
        setModalVisible(false);
        fetchPlaylists(); // Re-fetch playlists after successful creation
      } else {
        Alert.alert('Error', response.message || 'Failed to create playlist.');
        console.error('Failed to create playlist:', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
      console.error('Error creating playlist:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: designTokens.colors.system.background.primary }}>
        <View style={{ padding: designTokens.spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: designTokens.spacing.lg, alignSelf: 'flex-start' }}>
            <Ionicons name="arrow-back" size={24} color={designTokens.colors.system.label.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: designTokens.typography.fontSize.title1, fontWeight: 'bold', color: designTokens.colors.system.label.primary }}>Playlists</Text>
          <View style={{ marginTop: designTokens.spacing.lg }}>
            {[...Array(5)].map((_, index) => (
              <CardSkeleton key={`skeleton-${index}`} variant="list" />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: designTokens.colors.system.background.primary }}>
      <View style={{ padding: designTokens.spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: designTokens.spacing.lg, alignSelf: 'flex-start' }}>
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.system.label.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: designTokens.typography.fontSize.title1, fontWeight: 'bold', color: designTokens.colors.system.label.primary }}>Playlists</Text>
        {!isAuthenticated ? (
          <View style={{ marginTop: designTokens.spacing.lg, alignItems: 'center' }}>
            <Text style={{ color: designTokens.colors.system.label.secondary, marginBottom: designTokens.spacing.md }}>
              Please log in to create and manage your playlists.
            </Text>
            <Button onPress={() => router.push('/sign-in')}>Log In</Button>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginTop: designTokens.spacing.lg, padding: designTokens.spacing.md, backgroundColor: designTokens.colors.brand.primary, borderRadius: designTokens.borderRadius.md }}>
              <Text style={{ color: 'white', textAlign: 'center' }}>Create New Playlist</Text>
            </TouchableOpacity>
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => router.push(`/playlist/${item.id}` as any)} style={{ padding: designTokens.spacing.lg, borderBottomWidth: 1, borderBottomColor: designTokens.colors.system.separator.primary }}>
                  <View>
                    <Text style={{ fontSize: designTokens.typography.fontSize.body, color: designTokens.colors.system.label.primary }}>{item.name}</Text>
                    <Text style={{ fontSize: designTokens.typography.fontSize.caption1, color: designTokens.colors.system.label.secondary }}>{item.count} tracks</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ marginTop: designTokens.spacing.lg, alignItems: 'center' }}>
                  <Text style={{ color: designTokens.colors.system.label.secondary }}>
                    You don&apos;t have any playlists yet.
                  </Text>
                </View>
              }
              style={{ marginTop: designTokens.spacing.lg }}
            />
          </>
        )}
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: '80%', backgroundColor: designTokens.colors.system.background.secondary, padding: designTokens.spacing.xl, borderRadius: designTokens.borderRadius.lg }}>
            <Text style={{ fontSize: designTokens.typography.fontSize.title3, fontWeight: 'bold', color: designTokens.colors.system.label.primary }}>New Playlist</Text>
            <TextInput
              placeholder="Playlist Name"
              placeholderTextColor={designTokens.colors.system.label.secondary}
              style={{ marginTop: designTokens.spacing.lg, padding: designTokens.spacing.md, backgroundColor: designTokens.colors.system.background.primary, borderRadius: designTokens.borderRadius.md, color: designTokens.colors.system.label.primary }}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: designTokens.spacing.xl }}>
              <Button variant="destructive" onPress={() => setModalVisible(false)}>Cancel</Button>
              <Button onPress={handleCreatePlaylist}>Create</Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}