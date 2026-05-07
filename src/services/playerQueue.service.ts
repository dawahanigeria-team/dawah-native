import AsyncStorage from 'expo-sqlite/kv-store'

const QUEUE_SNAPSHOT_KEY = 'PLAYER_QUEUE_SNAPSHOT'

export type QueueSnapshot = {
  trackIds: string[]
  originalTrackIds?: string[] // Stores original order for shuffle restoration
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
