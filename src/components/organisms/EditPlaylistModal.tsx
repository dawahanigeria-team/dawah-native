import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../hooks/useTheme';
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
  // These rows used twrnc `dark:` variants, which follow the DEVICE colour
  // scheme rather than this app's theme store, so the modal ignored the
  // in-app toggle entirely. designTokens.colors is the deprecated dark-only
  // palette, which is the same bug in a different shape.
  const colors = useThemeColors();
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
        <View style={[tw`w-11/12 rounded-lg p-4`, { backgroundColor: colors.system.background.secondary }]}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={[tw`text-lg font-bold`, { color: colors.system.label.primary }]}>
              Edit Playlist
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.system.label.primary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[tw`rounded-md p-3 mb-4`, { backgroundColor: colors.system.fill.tertiary, color: colors.system.label.primary }]}
            placeholder="Playlist Name"
            placeholderTextColor={colors.system.label.secondary}
            value={name}
            onChangeText={setName}
          />

          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={{ color: colors.system.label.primary }}>Private Playlist</Text>
            <Switch
              trackColor={{ false: colors.system.fill.tertiary, true: colors.brand.primary }}
              thumbColor={isPrivate ? colors.system.background.primary : colors.system.background.primary}
              ios_backgroundColor={colors.system.fill.tertiary}
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
