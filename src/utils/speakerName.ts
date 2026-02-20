const PLACEHOLDER_SPEAKER_NAMES = new Set([
  'dawahnigeria',
  'unknown',
  'unknown lecturer',
  'unknown scholar',
  'n/a',
])

const DAWAH_NIGERIA_PATTERN = /\bdawah\s*nigeria\b/i

const TITLE_SPEAKER_SPLITTER = /\s[-|:]\s/

type PlaybackSpeakerSource = {
  title?: string | null
  lecturerName?: string | null
  rpname?: string | null
  reciterName?: string | null
  reciter_name?: string | null
  isReciter?: boolean | null
  is_reciter?: boolean | null
  reciter?: { name?: string | null; isReciter?: boolean | null } | null
  raw?: { rpname?: string | null; reciter_name?: string | null; is_reciter?: boolean | null } | null
}

export const normalizeSpeakerName = (value: string | undefined | null): string => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (PLACEHOLDER_SPEAKER_NAMES.has(trimmed.toLowerCase())) return ''
  if (DAWAH_NIGERIA_PATTERN.test(trimmed)) return ''
  return trimmed
}

export const extractSpeakerFromTitle = (title: string | undefined | null): string => {
  if (typeof title !== 'string') return ''
  const trimmed = title.trim()
  if (!trimmed) return ''

  const [head] = trimmed.split(TITLE_SPEAKER_SPLITTER)
  return normalizeSpeakerName(head)
}

export const pickSpeakerName = (candidates: Array<string | undefined | null>): string => {
  for (const value of candidates) {
    const normalized = normalizeSpeakerName(value)
    if (normalized) return normalized
  }
  return ''
}

const isRecitationPlayback = (source: PlaybackSpeakerSource): boolean => {
  const explicitFlags = [
    source.isReciter,
    source.is_reciter,
    source.reciter?.isReciter,
    source.raw?.is_reciter,
  ].filter((flag): flag is boolean => typeof flag === 'boolean')

  if (explicitFlags.length > 0) {
    return explicitFlags.some(Boolean)
  }

  return false
}

export const resolvePlaybackSpeakerName = (source: PlaybackSpeakerSource): string => {
  const lectureCandidates = [
    source.rpname,
    source.raw?.rpname,
    source.lecturerName,
  ]
  const reciterCandidates = [
    source.reciter_name,
    source.reciterName,
    source.reciter?.name,
    source.raw?.reciter_name,
  ]

  if (isRecitationPlayback(source)) {
    return pickSpeakerName([
      ...reciterCandidates,
      ...lectureCandidates,
      extractSpeakerFromTitle(source.title),
    ])
  }

  return pickSpeakerName([
    ...lectureCandidates,
    ...reciterCandidates,
    extractSpeakerFromTitle(source.title),
  ])
}
