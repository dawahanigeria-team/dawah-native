import TrackPlayer from 'react-native-track-player'
import playbackService from './src/services/trackPlayer.service'
import 'expo-router/entry'

TrackPlayer.registerPlaybackService(() => playbackService)
