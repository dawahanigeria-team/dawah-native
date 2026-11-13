import type { Lecturer, LecturerLecture } from '../../services/api/lecturers.api';
import { parseLectureDate } from '../../utils/formatDate';

export type LecturerAbout = {
  fullName: string;
  displayName: string;
  place: string | null;
  isLate: boolean;
  language: string | null;
  lectures: number | null;
  albums: number | null;
  plays: number | null;
  latestUpload: Date | null;
};

// tbl_rp stores "Shaykh X (Place) [RahimahuLlah]": the town and the honorific
// for a deceased scholar are folded into the name itself.
const TRAILING_HONORIFIC = /[\s-]*[[{][^\]}]*[\]}][\s-]*$/;
const TRAILING_PLACE = /\s*\(([^)]+)\)[\s-]*$/;

export function buildLecturerAbout(
  lecturer: Pick<Lecturer, 'name'> &
    Partial<Pick<Lecturer, 'language' | 'total_audio' | 'total_albums' | 'views'>>,
  latestLecture?: Partial<Pick<LecturerLecture, 'lang' | 'updated_date'>>,
): LecturerAbout {
  const fullName = lecturer.name.replace(/\s+/g, ' ').trim();
  let rest = fullName.replace(TRAILING_HONORIFIC, '');
  const placeMatch = rest.match(TRAILING_PLACE);
  if (placeMatch) rest = rest.slice(0, placeMatch.index);
  const uploaded = parseLectureDate(latestLecture?.updated_date);

  return {
    fullName,
    displayName: rest.trim(),
    place: placeMatch ? placeMatch[1].trim() : null,
    isLate: /rahimahu\s*llah/i.test(fullName),
    language: lecturer.language || latestLecture?.lang || null,
    lectures: lecturer.total_audio ?? null,
    albums: lecturer.total_albums ?? null,
    plays: lecturer.views ?? null,
    latestUpload: uploaded ? new Date(uploaded) : null,
  };
}
