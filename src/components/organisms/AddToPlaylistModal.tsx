import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { playlistApi } from '../../services/api/playlist.api';
import { CreatePlaylistResponse, UserPlaylist } from '../../types/api.types';
import { useThemeColors } from '../../hooks/useTheme';
import tw from '../../theme/twrnc';
import { useAuthStore } from '../../stores/authStore';

interface AddToPlaylistModalProps {
  isVisible: boolean;
  onClose: () => void;
  audioId: string;
  onAudioAdded: () => void;
}

export function createdPlaylistId(response: CreatePlaylistResponse): string | null {
  const id = response.playlist_id ?? response.data?.id ?? response.data?.nid;
  return id ? String(id) : null;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isVisible,
  onClose,
  audioId,
  onAudioAdded,
}) => {
  const { isAuthenticated } = useAuthStore();
  const colors = useThemeColors();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isVisible && isAuthenticated) {
      setShowCreate(false);
      setNewName('');
      const fetchPlaylists = async () => {
        setLoading(true);
        try {
          const response = await playlistApi.getUserPlaylists();
          if (response.success && response.playlists) {
            setPlaylists(response.playlists);
            setShowCreate(response.playlists.length === 0);
          } else {
            Alert.alert('Error', response.message || 'Failed to fetch playlists.');
          }
        } catch (error) {
          console.error('Error fetching playlists for modal:', error);
          Alert.alert('Error', 'Failed to load playlists.');
        } finally {
          setLoading(false);
        }
      };
      fetchPlaylists();
    } else if (isVisible && !isAuthenticated) {
      setLoading(false);
      Alert.alert('Authentication Required', 'Please log in to add audio to playlists.');
      onClose();
    }
  }, [isVisible, isAuthenticated]);

  const addAudio = async (playlistId: string) => {
    const response = await playlistApi.addAudioToPlaylist(playlistId, audioId);
    if (response.success) {
      onAudioAdded();
      onClose();
    } else {
      Alert.alert('Error', response.message || 'Failed to add audio to playlist.');
    }
  };

  const handleAddAudio = async (playlistId: string) => {
    setSavingTo(playlistId);
    try {
      await addAudio(playlistId);
    } catch (error) {
      console.error('Error adding audio to playlist:', error);
      Alert.alert('Error', 'An unexpected error occurred while adding audio.');
    } finally {
      setSavingTo(null);
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSavingTo('new');
    try {
      const response = await playlistApi.createPlaylist(name, false);
      const playlistId = createdPlaylistId(response);
      if (!playlistId) {
        Alert.alert('Error', response.message || 'Failed to create playlist.');
        return;
      }
      await addAudio(playlistId);
    } catch (error) {
      console.error('Error creating playlist from modal:', error);
      Alert.alert('Error', 'Could not create the playlist. Please try again.');
    } finally {
      setSavingTo(null);
    }
  };

  const busy = savingTo !== null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
      >
        <Pressable
          style={[
            tw`flex-1 justify-center items-center`,
            { backgroundColor: colors.overlay.darkMedium },
          ]}
          onPress={onClose}
          accessible={false}
        >
          <Pressable
            style={[
              tw`w-11/12 rounded-lg p-4`,
              styles.sheet,
              { backgroundColor: colors.system.background.secondary },
            ]}
            onPress={() => {}}
            accessible={false}
          >
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text
                style={[
                  tw`text-lg font-bold`,
                  { color: colors.system.label.primary },
                ]}
                accessibilityRole="header"
              >
                Add to Playlist
              </Text>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
              >
                <Ionicons name="close" size={24} color={colors.system.label.primary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.brand.primary} />
            ) : (
              <>
                {showCreate ? (
                  <View style={tw`mb-2`}>
                    {playlists.length === 0 && (
                      <Text style={[tw`mb-3`, { color: colors.system.label.secondary }]}>
                        You don't have any playlists yet. Name one and we'll add this lecture to it.
                      </Text>
                    )}
                    <TextInput
                      placeholder="Playlist name"
                      placeholderTextColor={colors.system.label.secondary}
                      accessibilityLabel="New playlist name"
                      value={newName}
                      onChangeText={setNewName}
                      autoFocus={playlists.length > 0}
                      maxLength={100}
                      returnKeyType="done"
                      onSubmitEditing={handleCreateAndAdd}
                      editable={!busy}
                      style={[
                        tw`rounded-md px-3`,
                        styles.input,
                        {
                          backgroundColor: colors.system.background.primary,
                          color: colors.system.label.primary,
                        },
                      ]}
                    />
                    <View style={tw`flex-row justify-end items-center mt-3`}>
                      {playlists.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setShowCreate(false)}
                          disabled={busy}
                          accessibilityRole="button"
                          style={[tw`px-4 mr-2 justify-center`, styles.button]}
                        >
                          <Text style={{ color: colors.system.label.primary }}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={handleCreateAndAdd}
                        disabled={busy || !newName.trim()}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: busy || !newName.trim(), busy: savingTo === 'new' }}
                        style={[
                          tw`px-5 rounded-full justify-center`,
                          styles.button,
                          {
                            backgroundColor: colors.brand.primary,
                            opacity: busy || !newName.trim() ? 0.5 : 1,
                          },
                        ]}
                      >
                        {savingTo === 'new' ? (
                          <ActivityIndicator size="small" color={colors.brand.onPrimary} />
                        ) : (
                          <Text style={[tw`font-bold`, { color: colors.brand.onPrimary }]}>
                            Create & add
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      tw`flex-row items-center py-3`,
                      styles.listRow,
                      { borderBottomColor: colors.system.separator.primary },
                    ]}
                    onPress={() => setShowCreate(true)}
                    disabled={busy}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color={colors.brand.primary}
                      style={tw`mr-3`}
                    />
                    <Text style={[tw`flex-1 font-bold`, { color: colors.brand.primary }]}>
                      New playlist
                    </Text>
                  </TouchableOpacity>
                )}

                <FlatList
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        tw`flex-row items-center py-3`,
                        styles.listRow,
                        { borderBottomColor: colors.system.separator.primary },
                      ]}
                      onPress={() => handleAddAudio(item.id)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Add to ${item.name}`}
                    >
                      <Ionicons
                        name="headset-outline"
                        size={24}
                        color={colors.system.label.secondary}
                        style={tw`mr-3`}
                      />
                      <Text style={[tw`flex-1`, { color: colors.system.label.primary }]}>
                        {item.name}
                      </Text>
                      {savingTo === item.id && (
                        <ActivityIndicator size="small" color={colors.brand.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '70%',
  },
  listRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 48,
  },
  button: {
    minHeight: 44,
  },
});

export default AddToPlaylistModal;
