/**
 * Editor-curated "special feature" rows, managed in the admin panel at
 * api.dawahnigeria.com/administer/spcl_ftr_row.php. The same endpoint feeds the
 * dawahnigeria.com home page, so a row an editor activates appears on both.
 */

import type { ListeningPreferences } from '../../types/listeningPreferences.types';
import type { Episode } from '../../types/types';
import { durationToSeconds } from '../../utils/quran';
import { API_CONFIG } from '../config/api.config';
import { apiClient } from './base.api';

const ENDPOINT = '/administer/api/spcl_ftr_api.php';
const CACHE_TTL_S = 30 * 60;

export interface SpecialFeatureLecture {
  episode: Episode;
  languageId: number;
  lecturerId: number;
}

export interface SpecialFeatureGroup {
  name: string;
  lectures: SpecialFeatureLecture[];
}

function toLecture(raw: any): SpecialFeatureLecture | null {
  const id = raw?.nid ?? raw?.id;
  const audioUrl = raw?.mp3_url || raw?.audio || '';
  if (!id || !audioUrl || String(raw?.status ?? '1') !== '1') return null;
  const rpname = raw.rpname || undefined;
  return {
    episode: {
      id: String(id),
      title: raw.mp3_title || raw.Title || 'Untitled Lecture',
      durationSec: durationToSeconds(raw.mp3_duration || raw.duration),
      coverUrl: raw.lec_thumbnail || raw.mp3_thumbnail || raw.img || '',
      coverUrlLarge: raw.lec_img || undefined,
      audioUrl,
      seriesId: '',
      plays: Number(raw.views) || 0,
      liked: false,
      language: raw.lang || '',
      downloads: Number(raw.downloads) || 0,
      createdAt: raw.updated_date || '',
      lecturerName: rpname,
      rpname,
    },
    languageId: Number(raw.lang_id) || 0,
    lecturerId: Number(raw.rp_id) || 0,
  };
}

export function parseSpecialFeatures(body: unknown): SpecialFeatureGroup[] {
  if (!Array.isArray(body)) return [];
  return body
    .map((group: any) => ({
      name: typeof group?.name === 'string' ? group.name.trim() : '',
      lectures: (Array.isArray(group?.more) ? group.more : [])
        .map(toLecture)
        .filter((lecture: SpecialFeatureLecture | null): lecture is SpecialFeatureLecture => lecture !== null),
    }))
    .filter((group) => group.name && group.lectures.length > 0);
}

/**
 * Mirrors the web: with preferences set, a lecture stays when its language or
 * its scholar was chosen, and a row left empty is dropped.
 */
export function applyListeningPreferences(
  groups: SpecialFeatureGroup[],
  preferences: Pick<ListeningPreferences, 'configured' | 'languageIds' | 'lecturerIds'>,
): SpecialFeatureGroup[] {
  if (!preferences.configured) return groups;
  return groups
    .map((group) => ({
      ...group,
      lectures: group.lectures.filter(
        (lecture) =>
          preferences.languageIds.includes(lecture.languageId) ||
          preferences.lecturerIds.includes(lecture.lecturerId),
      ),
    }))
    .filter((group) => group.lectures.length > 0);
}

export async function getSpecialFeatures(): Promise<SpecialFeatureGroup[]> {
  const response = await apiClient.get<unknown>(
    ENDPOINT,
    { action: 'get_spcl_ftr' },
    {
      useCache: true,
      cacheTTL: CACHE_TTL_S,
      headers: { 'User-Agent': API_CONFIG.USER_AGENT },
    },
  );
  return parseSpecialFeatures(response.data);
}
