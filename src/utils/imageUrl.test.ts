import { imageUrlForSlot } from './imageUrl';

const DN_LARGE = 'https://media.dawahnigeria.com/dnimages/large/307.jpeg';
const DC_FULL = 'https://media.dawahnigeria.com/dc_images/569.jpg';
const DC_THUMB = 'https://media.dawahnigeria.com/dc_images/thumbnails/569.jpg';

describe('imageUrlForSlot', () => {
  describe('dnimages', () => {
    it('drops a row from the 1920px large to the 248px thumbnail', () => {
      expect(imageUrlForSlot(DN_LARGE, 'row')).toBe(
        'https://media.dawahnigeria.com/dnimages/thumbnail/307.jpeg',
      );
    });

    it('keeps a hero on large', () => {
      expect(imageUrlForSlot(DN_LARGE, 'hero')).toBe(DN_LARGE);
    });

    it('keeps a card on large while medium is ungenerated', () => {
      // MEDIA_HAS_MEDIUM defaults false: requesting medium now would 404 and
      // expo-image would render a blank frame rather than falling back.
      expect(imageUrlForSlot(DN_LARGE, 'card')).toBe(DN_LARGE);
    });

    it('re-slots a URL that already names a variant', () => {
      const thumb = 'https://media.dawahnigeria.com/dnimages/thumbnail/307.jpeg';
      expect(imageUrlForSlot(thumb, 'hero')).toBe(DN_LARGE);
    });
  });

  describe('dc_images', () => {
    it('promotes the 100x80 thumbnail to the 250x200 root file for rows', () => {
      // thumbnails only covers a 33pt slot at 3x; Card.tsx rows are 44-60pt.
      expect(imageUrlForSlot(DC_THUMB, 'row')).toBe(DC_FULL);
    });

    it('leaves the root file alone at every slot', () => {
      expect(imageUrlForSlot(DC_FULL, 'row')).toBe(DC_FULL);
      expect(imageUrlForSlot(DC_FULL, 'card')).toBe(DC_FULL);
      expect(imageUrlForSlot(DC_FULL, 'hero')).toBe(DC_FULL);
    });
  });

  describe('pass-through', () => {
    it('returns empty string for missing values', () => {
      expect(imageUrlForSlot(undefined, 'row')).toBe('');
      expect(imageUrlForSlot(null, 'row')).toBe('');
      expect(imageUrlForSlot('', 'hero')).toBe('');
    });

    it('never rewrites a host we do not control', () => {
      const foreign = 'https://cdn.example.com/dnimages/large/307.jpeg';
      expect(imageUrlForSlot(foreign, 'row')).toBe(foreign);
    });

    it('leaves unrecognised media paths untouched', () => {
      const audio = 'https://media.dawahnigeria.com/dnlectures/Some/Talk.mp3';
      expect(imageUrlForSlot(audio, 'row')).toBe(audio);
    });

    it('does not treat a lookalike host as ours', () => {
      const spoof = 'https://media.dawahnigeria.com.evil.test/dnimages/large/1.jpeg';
      expect(imageUrlForSlot(spoof, 'row')).toBe(spoof);
    });
  });
});
