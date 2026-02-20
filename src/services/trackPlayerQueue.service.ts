import type { Episode } from '../types/types'
import { resolvePlaybackSpeakerName } from '../utils/speakerName'

export type TrackPlayerTrack = {
  id: string
  url: string
  title: string
  artist?: string
  artwork?: string
  duration?: number
}

const pickArtist = (episode: Episode): string => {
  return resolvePlaybackSpeakerName(episode)
}

export const buildTrack = (episode: Episode, url: string): TrackPlayerTrack => ({
  id: String(episode.id),
  url,
  title: episode.title,
  artist: pickArtist(episode),
  artwork: episode.coverUrl,
  duration: episode.durationSec,
})

export const buildQueue = (
  episodes: Episode[],
  resolveUrl: (episode: Episode) => string
): TrackPlayerTrack[] => episodes.map((episode) => buildTrack(episode, resolveUrl(episode)))

export const buildPlaylistKey = (episodes: Episode[]): string =>
  episodes.map((episode) => String(episode.id)).join('|')
