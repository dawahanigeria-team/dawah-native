import { buildQueue, buildTrack } from './trackPlayerQueue.service'

const episode = {
  id: '10',
  title: 'Lecture',
  lecturerName: 'Ustadh',
  coverUrl: 'img',
  audioUrl: 'https://example.com/audio.mp3',
  durationSec: 3600,
  seriesId: '',
  plays: 0,
  liked: false,
  language: 'Unknown',
  downloads: 0,
  createdAt: new Date().toISOString(),
}

test('buildTrack maps Episode to Track Player track', () => {
  const track = buildTrack(episode, 'file:///local.mp3')
  expect(track.id).toBe('10')
  expect(track.title).toBe('Lecture')
  expect(track.artist).toBe('Ustadh')
  expect(track.url).toBe('file:///local.mp3')
})

test('buildQueue preserves order', () => {
  const queue = buildQueue(
    [episode, { ...episode, id: '11', title: 'Next' }],
    (item) => item.audioUrl
  )
  expect(queue.map((track) => track.id)).toEqual(['10', '11'])
})

test('buildTrack ignores placeholder artist and falls back to reciter fields', () => {
  const track = buildTrack(
    {
      ...episode,
      lecturerName: 'DawahNigeria',
      reciter_name: 'Shaykh Reciter',
    } as any,
    'file:///local.mp3'
  )

  expect(track.artist).toBe('Shaykh Reciter')
})
