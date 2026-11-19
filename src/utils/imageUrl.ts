/**
 * Media image variant selection.
 *
 * media.dawahnigeria.com serves cover art from two directory families:
 *
 *   /dc_images/thumbnails/<id>.jpg   100x80   Drupal's artwork
 *   /dc_images/<id>.jpg              250x200  same picture, larger
 *
 *   /dnimages/thumbnail/<id>.jpeg    248x140  stock picture
 *   /dnimages/large/<id>.jpeg       1920x1080 a DIFFERENT stock picture
 *
 * The dnimages variants share an id but not a picture (39 of 39 sampled pairs
 * differed, 2026-11-19), so swapping between them changes what the lecture
 * shows. dnimages URLs are therefore never rewritten. The dc_images variants
 * are the same picture (31 of 31), so the 100x80 thumbnail, which only covers
 * a 33pt slot at 3x, is always promoted to the 250x200 file.
 */

const MEDIA_HOST = 'media.dawahnigeria.com';

const DC_IMAGES = /^(https?:\/\/[^/]+)\/dc_images\/(?:thumbnails\/)?([^/?#]+)$/;

/** Where the image is rendered. Kept so call sites can gain variants later. */
export type ImageSlot =
  /** 44-60pt avatars and list rows. */
  | 'row'
  /** ~140pt grid and section cards. */
  | 'card'
  /** Full-width hero slider and album headers. */
  | 'hero';

/** Exact host match — endsWith would also accept evilmedia.dawahnigeria.com. */
const isOwnMedia = (origin: string): boolean =>
  origin.split('//')[1] === MEDIA_HOST;

/**
 * Rewrite a media URL to the variant appropriate for `slot`.
 *
 * Anything unrecognised is returned untouched: empty values, third-party
 * hosts, dnimages, and any other path.
 */
export const imageUrlForSlot = (
  url: string | undefined | null,
  _slot: ImageSlot,
): string => {
  if (!url) return '';

  const dc = url.match(DC_IMAGES);
  if (dc && isOwnMedia(dc[1])) {
    return `${dc[1]}/dc_images/${dc[2]}`;
  }

  return url;
};
