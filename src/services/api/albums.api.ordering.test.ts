import {
  parseAlbumTrackDuration,
  sortAlbumTracksForPlayback,
  type AlbumTrack,
} from './albums.api';

const track = (id: number, title: string, trackNumber?: number): AlbumTrack => ({
  id,
  title,
  trackNumber,
  duration: '0',
  audioUrl: `https://example.com/${id}.mp3`,
});

describe('album playback ordering', () => {
  it('plays dated lectures from oldest to newest instead of raw API order', () => {
    const sorted = sortAlbumTracksForPlayback([
      track(30, 'Daily Talk (15-07-26)'),
      track(10, 'Daily Talk (09-07-26)'),
      track(20, 'Daily Talk (14-07-26)'),
    ]);
    expect(sorted.map(({ id }) => id)).toEqual([10, 20, 30]);
  });

  it('prefers explicit lesson sequence and track numbers', () => {
    expect(sortAlbumTracksForPlayback([
      track(3, 'Book Dars 12'),
      track(2, 'Book Dars 2'),
    ]).map(({ id }) => id)).toEqual([2, 3]);

    expect(sortAlbumTracksForPlayback([
      track(1, 'Closing', 2),
      track(2, 'Opening', 1),
    ]).map(({ id }) => id)).toEqual([2, 1]);
  });

  it('treats zero timestamps as missing durations', () => {
    expect(parseAlbumTrackDuration('00:00:00')).toBe(0);
    expect(parseAlbumTrackDuration('01:02:03')).toBe(3723);
  });
});
