import React from 'react';
import { Alert, Text, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import AddToPlaylistModal, { createdPlaylistId } from './AddToPlaylistModal';
import { playlistApi } from '../../services/api/playlist.api';

jest.mock('../../services/api/playlist.api', () => ({
  playlistApi: {
    getUserPlaylists: jest.fn(),
    createPlaylist: jest.fn(),
    addAudioToPlaylist: jest.fn(),
  },
}));
jest.mock('../../stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: true }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const api = playlistApi as jest.Mocked<typeof playlistApi>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

function pressByText(root: TestRenderer.ReactTestRenderer, text: string) {
  const label = root.root.find(n => n.type === Text && n.props.children === text);
  let node = label.parent;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  return node!.props.onPress();
}

test('reads the id the backend returns in data', () => {
  expect(createdPlaylistId({ success: true, message: '', data: { id: 42, nid: 42 } })).toBe('42');
  expect(createdPlaylistId({ success: true, message: '', playlist_id: 7 })).toBe('7');
  expect(createdPlaylistId({ success: false, message: 'nope' })).toBeNull();
});

test('with no playlists, creates one and adds the lecture to it', async () => {
  api.getUserPlaylists.mockResolvedValue({ success: true, message: '', playlists: [] } as any);
  api.createPlaylist.mockResolvedValue({ success: true, message: '', data: { id: 99, nid: 99 } });
  api.addAudioToPlaylist.mockResolvedValue({ success: true, message: '' } as any);
  const onAudioAdded = jest.fn();
  const onClose = jest.fn();

  let root!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    root = TestRenderer.create(
      <AddToPlaylistModal isVisible onClose={onClose} audioId="555" onAudioAdded={onAudioAdded} />,
    );
  });

  const input = root.root.findByType(TextInput);
  await act(async () => { input.props.onChangeText('  Quran  '); });
  await act(async () => { await pressByText(root, 'Create & add'); });

  expect(api.createPlaylist).toHaveBeenCalledWith('Quran', false);
  expect(api.addAudioToPlaylist).toHaveBeenCalledWith('99', '555');
  expect(onAudioAdded).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
  act(() => root.unmount());
});

test('with existing playlists, New playlist opens the form', async () => {
  api.getUserPlaylists.mockResolvedValue({
    success: true, message: '',
    playlists: [{ id: '1', name: 'Tafsir', count: 0, is_private: '0', user_id: '1', created_at: '', updated_at: '' }],
  } as any);

  let root!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    root = TestRenderer.create(
      <AddToPlaylistModal isVisible onClose={jest.fn()} audioId="555" onAudioAdded={jest.fn()} />,
    );
  });

  expect(root.root.findAllByType(TextInput)).toHaveLength(0);
  await act(async () => { await pressByText(root, 'New playlist'); });
  expect(root.root.findAllByType(TextInput)).toHaveLength(1);
  act(() => root.unmount());
});

test.each([
  ['an unsuccessful response', () => api.addAudioToPlaylist.mockResolvedValueOnce({ success: false, message: 'Server busy' } as any)],
  ['a rejected request', () => api.addAudioToPlaylist.mockRejectedValueOnce(new Error('offline'))],
])('a failed add after create is retried on the new playlist, not by creating again (%s)', async (_label, failFirstAdd) => {
  api.getUserPlaylists.mockResolvedValue({ success: true, message: '', playlists: [] } as any);
  api.createPlaylist.mockResolvedValue({ success: true, message: '', data: { id: 99, nid: 99 } });
  failFirstAdd();
  api.addAudioToPlaylist.mockResolvedValueOnce({ success: true, message: '' } as any);
  const onAudioAdded = jest.fn();

  let root!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    root = TestRenderer.create(
      <AddToPlaylistModal isVisible onClose={jest.fn()} audioId="555" onAudioAdded={onAudioAdded} />,
    );
  });

  await act(async () => { root.root.findByType(TextInput).props.onChangeText('Quran'); });
  await act(async () => { await pressByText(root, 'Create & add'); });

  expect(onAudioAdded).not.toHaveBeenCalled();
  expect(root.root.findAllByType(TextInput)).toHaveLength(0);

  await act(async () => { await pressByText(root, 'Quran'); });

  expect(api.createPlaylist).toHaveBeenCalledTimes(1);
  expect(api.addAudioToPlaylist.mock.calls).toEqual([['99', '555'], ['99', '555']]);
  expect(onAudioAdded).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

test('Cancel discards the draft name', async () => {
  api.getUserPlaylists.mockResolvedValue({
    success: true, message: '',
    playlists: [{ id: '1', name: 'Tafsir', count: 0, is_private: '0', user_id: '1', created_at: '', updated_at: '' }],
  } as any);

  let root!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    root = TestRenderer.create(
      <AddToPlaylistModal isVisible onClose={jest.fn()} audioId="555" onAudioAdded={jest.fn()} />,
    );
  });

  await act(async () => { await pressByText(root, 'New playlist'); });
  await act(async () => { root.root.findByType(TextInput).props.onChangeText('Draft'); });
  await act(async () => { await pressByText(root, 'Cancel'); });
  await act(async () => { await pressByText(root, 'New playlist'); });

  expect(root.root.findByType(TextInput).props.value).toBe('');
  act(() => root.unmount());
});
