import React, { useState, useEffect } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playlistApi } from '../../services/api/playlist.api';
import { UserPlaylist } from '../../types/api.types';
import { designTokens } from '../../theme/designTokens';
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
    } else if (!isAuthenticated) {
      setLoading(false);
      Alert.alert('Authentication Required', 'Please log in to add audio to playlists.');
      onClose();
    }
  }, [isVisible, isAuthenticated, onClose]);

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
      <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
        <View style={tw`w-11/12 bg-white dark:bg-zinc-800 rounded-lg p-4`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`text-lg font-bold text-zinc-900 dark:text-white`}>
              Add to Playlist
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={designTokens.colors.system.label.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
          ) : playlists.length === 0 ? (
            <Text style={tw`text-zinc-600 dark:text-zinc-400 text-center my-4`}>
              No playlists found. Create one first!
            </Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={tw`flex-row items-center py-3 border-b border-zinc-200 dark:border-zinc-700`}
                  onPress={() => handleAddAudio(item.id)}
                  disabled={addingAudio}
                >
                  <Ionicons
                    name="musical-notes-outline"
                    size={24}
                    color={designTokens.colors.system.label.secondary}
                    style={tw`mr-3`}
                  />
                  <Text style={tw`flex-1 text-zinc-900 dark:text-white`}>{item.name}</Text>
                  {addingAudio && (
                    <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default AddToPlaylistModal;