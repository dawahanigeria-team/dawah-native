import type { Lecturer, LecturerLecture } from '../../services/api/lecturers.api';

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

export function buildLecturerAbout(
  lecturer: Pick<Lecturer, 'name'> &
    Partial<Pick<Lecturer, 'language' | 'total_audio' | 'total_albums' | 'views'>>,
  latestLecture?: Partial<Pick<LecturerLecture, 'lang' | 'updated_date'>>,
): LecturerAbout {
  throw new Error('not implemented');
}
