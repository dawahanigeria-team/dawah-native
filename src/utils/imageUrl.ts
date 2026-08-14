/**
 * Media image variant selection.
 *
 * media.dawahnigeria.com serves cover art from two independent directory
 * families with different variant conventions. Measured 2026-08-11:
 *
 *   /dnimages/thumbnail/<id>.jpeg    248x140      4-13 KB
 *   /dnimages/large/<id>.jpeg       1920x1080    74-475 KB  (median 163 KB)
 *
 *   /dc_images/thumbnails/<id>.jpg   100x80     2.5 KB median
 *   /dc_images/<id>.jpg              250x200     25 KB median  (no subdirectory)
 *
 * Note the inconsistent spelling — dnimages uses "thumbnail", dc_images uses
 * "thumbnails" — and that dc_images keeps its full size at the directory root
 * rather than under a variant segment.
 *
 * Neither ladder has a usable middle rung. On a 3x screen a 140pt card needs
 * ~420px: dnimages jumps from 248px straight to 1920px, and dc_images tops out
 * at 250px. So this module can only bank the wins that exist today, and the
 * slot mapping is written so the rest arrive by flipping MEDIA_HAS_MEDIUM once
 * the derivatives are generated.
 */

import { ENV } from '@/config/env';

const MEDIA_HOST = 'media.dawahnigeria.com';

const DNIMAGES = /^(https?:\/\/[^/]+)\/dnimages\/(?:thumbnail|medium|large)\/([^/?#]+)$/;
const DC_IMAGES = /^(https?:\/\/[^/]+)\/dc_images\/(?:thumbnails\/)?([^/?#]+)$/;

/**
 * Where the image is rendered. Slots rather than pixel widths, because call
 * sites are layout-driven and the width-to-variant mapping should move in one
 * place when the ladder gains a rung.
 *
 * Widths below are the 3x Android case — the device that asks for the most
 * pixels and is least able to decode them.
 */
export type ImageSlot =
  /** 44-60pt avatars and list rows. Needs up to ~180px. */
  | 'row'
  /** ~140pt grid and section cards. Needs ~420px. */
  | 'card'
  /** Full-width hero slider and album headers. Needs ~1080px. */
  | 'hero';

/**
 * Generating /dnimages/medium/ is server-side work that has not run yet.
 * expo-image does not retry a 404 against another URL — it fires onError and
 * leaves a blank frame — so requesting a variant before it exists trades bytes
 * for visibly broken art. Flipping this flag upgrades every 'card' call site.
 */
const HAS_MEDIUM = ENV.MEDIA_HAS_MEDIUM;

/**
 * dnimages has real headroom to give back: a row rendering the 1920x1080
 * `large` is downloading 163 KB to fill 180px. thumbnail's 248px covers it
 * outright, which is the one unambiguous win available before any server work.
 *
 * 'card' stays on `large` until medium exists — thumbnail's 248px against a
 * 420px slot would be visible mush, and trading sharpness for bytes is the
 * wrong direction on the screens users actually look at.
 */
const DNIMAGES_VARIANT: Record<ImageSlot, string> = {
  row: 'thumbnail',
  card: HAS_MEDIUM ? 'medium' : 'large',
  hero: 'large',
};

/**
 * dc_images has no headroom in either direction. Its 100x80 `thumbnails` only
 * covers a 33pt slot at 3x, so it is already too small for the 44-60pt rows
 * Card.tsx renders, and its 250x200 full size is itself below what a card or
 * hero needs. Every slot therefore keeps the root file: undersizing is visible
 * to users, and the 25 KB median is not where the weight is anyway.
 *
 * This is a placeholder for a real ladder, not a considered mapping.
 */
const dcImagesUrl = (origin: string, filename: string) =>
  `${origin}/dc_images/${filename}`;

/** Exact host match — endsWith would also accept evilmedia.dawahnigeria.com. */
const isOwnMedia = (origin: string): boolean =>
  origin.split('//')[1] === MEDIA_HOST;

/**
 * Rewrite a media URL to the variant appropriate for `slot`.
 *
 * Anything unrecognised is returned untouched: empty values, third-party
 * hosts, and any path not matching the two known families. Rewriting a URL we
 * do not control risks a 404 to save a few KB, which is never the right trade.
 */
export const imageUrlForSlot = (
  url: string | undefined | null,
  slot: ImageSlot,
): string => {
  if (!url) return '';

  const dn = url.match(DNIMAGES);
  if (dn && isOwnMedia(dn[1])) {
    return `${dn[1]}/dnimages/${DNIMAGES_VARIANT[slot]}/${dn[2]}`;
  }

  const dc = url.match(DC_IMAGES);
  if (dc && isOwnMedia(dc[1])) {
    return dcImagesUrl(dc[1], dc[2]);
  }

  return url;
};
