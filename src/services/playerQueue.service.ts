import AsyncStorage from 'expo-sqlite/kv-store'
import type { Episode } from '../types/types'

const QUEUE_SNAPSHOT_KEY = 'PLAYER_QUEUE_SNAPSHOT'

export type QueueEpisodeSnapshot = Pick<
  Episode,
  | 'id'
  | 'title'
  | 'durationSec'
  | 'coverUrl'
  | 'audioUrl'
  | 'seriesId'
  | 'plays'
  | 'liked'
  | 'language'
  | 'downloads'
  | 'createdAt'
  | 'lecturerName'
  | 'rpname'
  | 'reciterName'
  | 'reciter_name'
  | 'isReciter'
  | 'is_reciter'
  | 'reciter'
>

export const toQueueEpisodeSnapshot = (episode: Episode): QueueEpisodeSnapshot => ({
  id: String(episode.id),
  title: episode.title,
  durationSec: episode.durationSec,
  coverUrl: episode.coverUrl,
  audioUrl: episode.audioUrl,
  seriesId: episode.seriesId,
  plays: episode.plays,
  liked: episode.liked,
  language: episode.language,
  downloads: episode.downloads,
  createdAt: episode.createdAt,
  lecturerName: episode.lecturerName,
  rpname: episode.rpname,
  reciterName: episode.reciterName,
  reciter_name: episode.reciter_name,
  isReciter: episode.isReciter,
  is_reciter: episode.is_reciter,
  reciter: episode.reciter,
})

export type QueueSnapshot = {
  trackIds: string[]
  originalTrackIds?: string[] // Stores original order for shuffle restoration
  currentIndex: number
  position: number
  playbackRate: number
  repeatMode: 'off' | 'one' | 'all'
  isShuffled: boolean
  episodes?: QueueEpisodeSnapshot[]
  originalEpisodes?: QueueEpisodeSnapshot[]
  currentTrack?: {
    id: string
    title: string
    artist?: string
    artwork?: string
  }
}

export const saveQueueSnapshot = async (snapshot: QueueSnapshot): Promise<void> => {
  await AsyncStorage.setItem(QUEUE_SNAPSHOT_KEY, JSON.stringify(snapshot))
}

export const loadQueueSnapshot = async (): Promise<QueueSnapshot | null> => {
  const raw = await AsyncStorage.getItem(QUEUE_SNAPSHOT_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    if (
      !Array.isArray(parsed?.trackIds) ||
      typeof parsed?.currentIndex !== 'number' ||
      typeof parsed?.position !== 'number'
    ) {
      return null
    }
    return parsed as QueueSnapshot
  } catch {
    return null
  }
}

export const clearQueueSnapshot = async (): Promise<void> => {
  await AsyncStorage.removeItem(QUEUE_SNAPSHOT_KEY)
}
