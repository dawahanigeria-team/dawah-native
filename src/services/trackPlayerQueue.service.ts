import type { Episode } from '../types/types'
import { extractSpeakerFromTitle, pickSpeakerName } from '../utils/speakerName'

export type TrackPlayerTrack = {
  id: string
  url: string
  title: string
  artist?: string
  artwork?: string
  duration?: number
}

const pickArtist = (episode: Episode): string => {
  const extendedEpisode = episode as Episode & {
    rpname?: string
    reciterName?: string
    reciter_name?: string
    reciter?: { name?: string }
    raw?: { rpname?: string; reciter_name?: string }
  }

  return pickSpeakerName([
    extendedEpisode.rpname,
    extendedEpisode.raw?.rpname,
    extendedEpisode.reciter_name,
    extendedEpisode.reciterName,
    extendedEpisode.reciter?.name,
    extendedEpisode.raw?.reciter_name,
    episode.lecturerName,
    extractSpeakerFromTitle(episode.title),
  ])
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
