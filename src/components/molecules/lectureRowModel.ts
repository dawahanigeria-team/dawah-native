import type { SearchLecture } from '../../types/api.types';
import type { Episode } from '../../types/types';

export type LectureLeading =
  | { kind: 'artwork'; url: string | null; position?: number }
  | { kind: 'position'; position: number };

export interface LectureRowModel {
  id: string;
  title: string;
  scholar: string | null;
  durationSec: number | null;
  meta: string | null;
  leading: LectureLeading;
}

export type LecturePlayback = 'idle' | 'playing' | 'paused';

export type LectureDownload =
  | { status: 'none' }
  | { status: 'queued' }
  | { status: 'downloading'; progress: number }
  | { status: 'downloaded' };

export const NOT_DOWNLOADED: LectureDownload = { status: 'none' };

export const parseClockDuration = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  if (!value) return null;
  const parts = value.trim().split(':').map(Number);
  if (parts.length > 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 ? seconds : null;
};

export const formatClock = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const mmss = `${String(minutes).padStart(hours > 0 ? 2 : 1, '0')}:${String(secs).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
};

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'}`;

export const spokenDuration = (seconds: number): string => {
  if (seconds < 60) return plural(seconds, 'second');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours > 0 ? plural(hours, 'hour') : null, minutes > 0 ? plural(minutes, 'minute') : null]
    .filter(Boolean)
    .join(' ');
};

export const compactCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
};

// The API sends some of these fields, such as `id`, as numbers despite their types.
const text = (...candidates: (string | number | null | undefined)[]): string | null => {
  for (const candidate of candidates) {
    const trimmed = candidate == null ? null : String(candidate).trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const playsMeta = (plays: string | number | null | undefined): string | null => {
  const count = Number(plays);
  return Number.isFinite(count) && count > 0 ? `${compactCount(count)} plays` : null;
};

export const episodeToRow = (episode: Episode, options: { position?: number } = {}): LectureRowModel => ({
  id: episode.id,
  title: text(episode.title) ?? 'Untitled',
  scholar: text(episode.lecturerName, episode.rpname, episode.reciterName, episode.reciter_name),
  durationSec: parseClockDuration(episode.durationSec),
  meta: text(episode.language),
  leading: { kind: 'artwork', url: text(episode.coverUrl), position: options.position },
});

interface LecturerLectureShape {
  nid: number;
  title: string;
  img: string;
  duration: string;
  rpname: string;
  views: number;
}

export const lecturerLectureToRow = (lecture: LecturerLectureShape, position: number): LectureRowModel => ({
  id: String(lecture.nid),
  title: text(lecture.title) ?? 'Untitled',
  scholar: text(lecture.rpname),
  durationSec: parseClockDuration(lecture.duration),
  meta: playsMeta(lecture.views),
  leading: { kind: 'artwork', url: text(lecture.img), position },
});

interface NumberedTrackShape {
  id: string | number;
  title: string;
  duration: string;
  trackNumber?: number;
  plays?: number;
}

export const albumTrackToRow = (
  track: NumberedTrackShape,
  context: { position: number; scholar?: string | null },
): LectureRowModel => ({
  id: String(track.id),
  title: text(track.title) ?? 'Untitled',
  scholar: text(context.scholar),
  durationSec: parseClockDuration(track.duration),
  meta: playsMeta(track.plays),
  leading: { kind: 'position', position: context.position },
});

export const quranRecitationToRow = (
  recitation: NumberedTrackShape,
  context: { position: number; reciter?: string | null },
): LectureRowModel => ({
  ...albumTrackToRow(recitation, { position: context.position, scholar: context.reciter }),
  leading: { kind: 'position', position: recitation.trackNumber || context.position },
});

export const searchLectureToRow = (lecture: SearchLecture, options: { position?: number } = {}): LectureRowModel => ({
  id: text(lecture.id) ?? String(lecture.nid ?? ''),
  title: text(lecture.Title, lecture.mp3_title) ?? 'Untitled',
  scholar: text(lecture.lecturer_name, lecture.rpname, lecture.ResourcePerson),
  durationSec: parseClockDuration(lecture.mp3_duration ?? lecture.duration ?? lecture.Duration),
  meta: playsMeta(lecture.views ?? lecture.Plays),
  leading: { kind: 'artwork', url: text(lecture.img, lecture.lec_img, lecture.CoverUrl), position: options.position },
});

export type ChartWindow = 'daily' | 'weekly' | 'monthly';

const CHART_WINDOW_LABEL: Record<ChartWindow, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

interface ChartLectureShape {
  id: number;
  mp3_title?: string;
  lec_thumbnail?: string;
  img?: string;
  language?: string;
  charts?: Record<ChartWindow, number>;
}

export const chartLectureToRow = (
  item: ChartLectureShape,
  context: { position: number; period: ChartWindow },
): LectureRowModel => {
  const count = item.charts?.[context.period] ?? 0;
  return {
    id: String(item.id),
    title: text(item.mp3_title) ?? 'Untitled',
    scholar: null,
    durationSec: null,
    meta: [text(item.language), `${compactCount(count)} plays ${CHART_WINDOW_LABEL[context.period]}`]
      .filter(Boolean)
      .join(' • '),
    leading: { kind: 'artwork', url: text(item.lec_thumbnail, item.img), position: context.position },
  };
};
