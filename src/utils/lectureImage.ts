type LectureImageFields = {
  img?: unknown;
  mp3_thumbnail?: unknown;
  lec_img?: unknown;
  lec_thumbnail?: unknown;
};

const nonEmpty = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * The one picture a lecture shows on every screen.
 *
 * `img`/`mp3_thumbnail` are the artwork Drupal assigned (dc_images, matches
 * Drupal for 99.99% of lectures). `lec_img`/`lec_thumbnail` are a second,
 * unrelated stock picture and only stand in when a lecture has no Drupal art.
 */
export const lectureImage = (lecture: LectureImageFields | null | undefined): string =>
  nonEmpty(lecture?.img) ??
  nonEmpty(lecture?.mp3_thumbnail) ??
  nonEmpty(lecture?.lec_img) ??
  nonEmpty(lecture?.lec_thumbnail) ??
  '';
