import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { designTokens } from '../../theme/designTokens';
import tw from '../../theme/twrnc';

interface EditPlaylistModalProps {
  isVisible: boolean;
  onClose: () => void;
  playlistId: string;
  currentName: string;
  currentIsPrivate: boolean;
  onPlaylistUpdated: (newName: string, newIsPrivate: boolean) => void;
}

const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  isVisible,
  onClose,
  playlistId: _playlistId,
  currentName,
  currentIsPrivate,
  onPlaylistUpdated: _onPlaylistUpdated,
}) => {
  const [name, setName] = useState(currentName);
  const [isPrivate, setIsPrivate] = useState(currentIsPrivate);

  useEffect(() => {
    setName(currentName);
    setIsPrivate(currentIsPrivate);
  }, [currentName, currentIsPrivate]);

  const handleSave = async () => {
    if (name.trim() === '') {
      Alert.alert('Error', 'Playlist name cannot be empty.');
      return;
    }

    // Since the backend doesn't support updating playlists, show a message
    Alert.alert('Feature Not Available', 'Updating playlist metadata is not currently supported by the backend API.');
    onClose();
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
              Edit Playlist
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={designTokens.colors.system.label.primary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={tw`bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-md p-3 mb-4`}
            placeholder="Playlist Name"
            placeholderTextColor={designTokens.colors.system.label.secondary}
            value={name}
            onChangeText={setName}
          />

          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-zinc-900 dark:text-white`}>Private Playlist</Text>
            <Switch
              trackColor={{ false: designTokens.colors.system.fill.tertiary, true: designTokens.colors.brand.primary }}
              thumbColor={isPrivate ? designTokens.colors.system.background.primary : designTokens.colors.system.background.primary}
              ios_backgroundColor={designTokens.colors.system.fill.tertiary}
              onValueChange={setIsPrivate}
              value={isPrivate}
            />
          </View>

          <TouchableOpacity
            style={tw`bg-blue-500 rounded-md p-3 items-center`}
            onPress={handleSave}
          >
            <Text style={tw`text-white font-bold`}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EditPlaylistModal;
