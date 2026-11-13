import type { Lecturer, LecturerLecture } from '../../services/api/lecturers.api';
import { parseLectureDate } from '../../utils/formatDate';
import { LANGUAGE_MAP } from '../../utils/languages';

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
// resolveLanguage() in lecturers.api.ts fills a missing language with this.
const UNKNOWN_LANGUAGE = 'Unknown';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildLecturerAbout(
  lecturer: Pick<Lecturer, 'name'> &
    Partial<Pick<Lecturer, 'language' | 'total_audio' | 'total_albums' | 'views'>>,
  latestLecture?: Partial<Pick<LecturerLecture, 'lang' | 'updated_date'>>,
): LecturerAbout {
  const fullName = lecturer.name.replace(/\s+/g, ' ').trim();
  let rest = fullName.replace(TRAILING_HONORIFIC, '');
  const placeMatch = rest.match(TRAILING_PLACE);
  if (placeMatch) rest = rest.slice(0, placeMatch.index);
  const bracketed = placeMatch ? placeMatch[1].trim() : null;
  const bracketedLanguage = bracketed && bracketed in LANGUAGE_MAP ? bracketed : null;
  const uploaded = parseLectureDate(latestLecture?.updated_date);

  return {
    fullName,
    displayName: rest.trim(),
    place: bracketedLanguage ? null : bracketed,
    isLate: /rahimahu\s*llah/i.test(fullName),
    language:
      (lecturer.language !== UNKNOWN_LANGUAGE && lecturer.language) ||
      latestLecture?.lang ||
      bracketedLanguage ||
      null,
    lectures: lecturer.total_audio ?? null,
    albums: lecturer.total_albums ?? null,
    plays: lecturer.views ?? null,
    latestUpload: uploaded ? new Date(uploaded) : null,
  };
}

export type LecturerAboutFact = {
  key: 'lectures' | 'albums' | 'plays' | 'latestUpload';
  label: string;
};

const count = (n: number, one: string, many: string) =>
  `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ${n === 1 ? one : many}`;

export function lecturerAboutFacts(about: LecturerAbout): LecturerAboutFact[] {
  const facts: LecturerAboutFact[] = [];
  if (about.lectures !== null) {
    facts.push({ key: 'lectures', label: count(about.lectures, 'lecture', 'lectures') });
  }
  if (about.albums !== null) {
    facts.push({ key: 'albums', label: count(about.albums, 'album', 'albums') });
  }
  if (about.plays !== null) {
    facts.push({ key: 'plays', label: count(about.plays, 'play', 'plays') });
  }
  if (about.latestUpload) {
    const d = about.latestUpload;
    facts.push({
      key: 'latestUpload',
      label: `Latest upload ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
    });
  }
  return facts;
}
