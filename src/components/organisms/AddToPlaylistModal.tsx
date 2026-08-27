import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { playlistApi } from '../../services/api/playlist.api';
import { UserPlaylist } from '../../types/api.types';
import { useThemeColors } from '../../hooks/useTheme';
import tw from '../../theme/twrnc';
import { useAuthStore } from '../../stores/authStore';

interface AddToPlaylistModalProps {
  isVisible: boolean;
  onClose: () => void;
  audioId: string;
  onAudioAdded: () => void;
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
  const [addingAudio, setAddingAudio] = useState(false);

  useEffect(() => {
    if (isVisible && isAuthenticated) {
      const fetchPlaylists = async () => {
        setLoading(true);
        try {
          const response = await playlistApi.getUserPlaylists();
          if (response.success && response.playlists) {
            setPlaylists(response.playlists);
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

  const handleAddAudio = async (playlistId: string) => {
    setAddingAudio(true);
    try {
      const response = await playlistApi.addAudioToPlaylist(playlistId, audioId);
      if (response.success) {
        Alert.alert('Success', response.message || 'Audio added to playlist!');
        onAudioAdded();
        onClose();
      } else {
        Alert.alert('Error', response.message || 'Failed to add audio to playlist.');
      }
    } catch (error) {
      console.error('Error adding audio to playlist:', error);
      Alert.alert('Error', 'An unexpected error occurred while adding audio.');
    } finally {
      setAddingAudio(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          tw`flex-1 justify-center items-center`,
          { backgroundColor: colors.overlay.darkMedium },
        ]}
        onPress={onClose}
      >
        <Pressable
          style={[
            tw`w-11/12 rounded-lg p-4`,
            { backgroundColor: colors.system.background.secondary },
          ]}
          onPress={() => {}}
        >
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text
              style={[
                tw`text-lg font-bold`,
                { color: colors.system.label.primary },
              ]}
            >
              Add to Playlist
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.system.label.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.brand.primary} />
          ) : playlists.length === 0 ? (
            <Text
              style={[
                tw`text-center my-4`,
                { color: colors.system.label.secondary },
              ]}
            >
              No playlists found. Create one first!
            </Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    tw`flex-row items-center py-3`,
                    styles.listRow,
                    { borderBottomColor: colors.system.separator.primary },
                  ]}
                  onPress={() => handleAddAudio(item.id)}
                  disabled={addingAudio}
                >
                  <Ionicons
                    name="musical-notes-outline"
                    size={24}
                    color={colors.system.label.secondary}
                    style={tw`mr-3`}
                  />
                  <Text style={[tw`flex-1`, { color: colors.system.label.primary }]}>
                    {item.name}
                  </Text>
                  {addingAudio && (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  listRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default AddToPlaylistModal;
