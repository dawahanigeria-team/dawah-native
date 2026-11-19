import { lectureImage } from './lectureImage';

// Lecture 21803 "Q19- Shaykh Mahmud Jaafar": Drupal's artwork is 694.jpg.
const DRUPAL_FULL = 'https://media.dawahnigeria.com/dc_images/694.jpg';
const DRUPAL_THUMB = 'https://media.dawahnigeria.com/dc_images/thumbnails/694.jpg';
const STOCK_LARGE = 'https://media.dawahnigeria.com/dnimages/large/718.jpeg';
const STOCK_THUMB = 'https://media.dawahnigeria.com/dnimages/thumbnail/718.jpeg';

describe('lectureImage', () => {
  it('prefers the Drupal artwork over the stock picture', () => {
    expect(lectureImage({ img: DRUPAL_FULL, mp3_thumbnail: DRUPAL_THUMB, lec_img: STOCK_LARGE, lec_thumbnail: STOCK_THUMB }))
      .toBe(DRUPAL_FULL);
  });

  it('uses the Drupal thumbnail when an endpoint omits img', () => {
    expect(lectureImage({ mp3_thumbnail: DRUPAL_THUMB, lec_img: STOCK_LARGE })).toBe(DRUPAL_THUMB);
  });

  it('falls back to the stock picture only when there is no Drupal artwork', () => {
    expect(lectureImage({ img: '', mp3_thumbnail: ' ', lec_img: STOCK_LARGE })).toBe(STOCK_LARGE);
    expect(lectureImage({ lec_thumbnail: STOCK_THUMB })).toBe(STOCK_THUMB);
  });

  it('returns an empty string when there is no picture', () => {
    expect(lectureImage({})).toBe('');
    expect(lectureImage(null)).toBe('');
  });
});
