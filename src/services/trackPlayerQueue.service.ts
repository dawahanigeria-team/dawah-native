import type { Episode } from '../types/types'

export type TrackPlayerTrack = {
  id: string
  url: string
  title: string
  artist?: string
  artwork?: string
  duration?: number
}

const PLACEHOLDER_ARTIST_NAMES = new Set([
  'dawahnigeria',
  'unknown',
  'unknown lecturer',
  'unknown scholar',
  'n/a',
])

const normalizeArtist = (value: string | undefined | null): string => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (PLACEHOLDER_ARTIST_NAMES.has(trimmed.toLowerCase())) return ''
  return trimmed
}

const pickArtist = (episode: Episode): string => {
  const extendedEpisode = episode as Episode & {
    rpname?: string
    reciterName?: string
    reciter_name?: string
    reciter?: { name?: string }
    raw?: { rpname?: string; reciter_name?: string }
  }

  const candidates = [
    episode.lecturerName,
    extendedEpisode.rpname,
    extendedEpisode.reciterName,
    extendedEpisode.reciter_name,
    extendedEpisode.reciter?.name,
    extendedEpisode.raw?.rpname,
    extendedEpisode.raw?.reciter_name,
  ]

  for (const candidate of candidates) {
    const artist = normalizeArtist(candidate)
    if (artist) return artist
  }

  return ''
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
