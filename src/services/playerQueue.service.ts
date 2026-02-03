import AsyncStorage from 'expo-sqlite/kv-store'

const QUEUE_SNAPSHOT_KEY = 'PLAYER_QUEUE_SNAPSHOT'

export type QueueSnapshot = {
  trackIds: string[]
  currentIndex: number
  position: number
  playbackRate: number
  repeatMode: 'off' | 'one' | 'all'
  isShuffled: boolean
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
  return JSON.parse(raw) as QueueSnapshot
}

export const clearQueueSnapshot = async (): Promise<void> => {
  await AsyncStorage.removeItem(QUEUE_SNAPSHOT_KEY)
}
