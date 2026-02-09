const PLACEHOLDER_SPEAKER_NAMES = new Set([
  'dawahnigeria',
  'unknown',
  'unknown lecturer',
  'unknown scholar',
  'n/a',
])

const DAWAH_NIGERIA_PATTERN = /\bdawah\s*nigeria\b/i

const TITLE_SPEAKER_SPLITTER = /\s[-|:]\s/

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

