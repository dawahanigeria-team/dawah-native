import { encodeMediaUrl } from './mediaUrl'

describe('encodeMediaUrl', () => {
  const base = 'https://media.dawahnigeria.com/Scholar/'

  test('encodes raw reserved characters in catalogue file names', () => {
    expect(encodeMediaUrl(`${base}Annabi {S.A.W} [Part 1] Ustaz's.mp3`)).toBe(
      `${base}Annabi%20%7BS.A.W%7D%20%5BPart%201%5D%20Ustaz%27s.mp3`,
    )
  })

  test('leaves existing escapes alone, including reserved ones', () => {
    const encoded = `${base}Q%26A%20Session%2F2%20%7BS.A.W%7D.mp3`

    expect(encodeMediaUrl(encoded)).toBe(encoded)
  })

  test('encodes a literal percent that is not an escape', () => {
    expect(encodeMediaUrl(`${base}100% Tawheed.mp3`)).toBe(`${base}100%25%20Tawheed.mp3`)
  })

  test('passes non-http values through', () => {
    expect(encodeMediaUrl('file:///downloads/a b.mp3')).toBe('file:///downloads/a b.mp3')
    expect(encodeMediaUrl('')).toBe('')
  })
})
