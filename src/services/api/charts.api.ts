import { API_CONFIG } from '../config/api.config';

const BASE_URL = `${API_CONFIG.BASE_URL}/api/`;

export interface ChartItem {
  _id?: { $oid: string };
  post_date?: string;
  id: number;
  hashed?: string;
  name?: string;
  mp3_title?: string; // For Lecture Charts
  img?: string;
  alb_thumbnail?: string;
  lec_thumbnail?: string; // For Lecture Charts
  rp_thumbnail?: string; // For Lecturer Charts
  lec_no?: number;
  rp_id?: number;
  reciter_id?: number;
  lang_id?: number;
  categories?: string;
  Keywords?: string;
  language?: string;
  status?: string;
  views?: number;
  downloads?: number;
  key_id?: string;
  album_image?: string;
  album_id?: number; // Added for Lecture Charts
  charts?: {
    daily: number;
    monthly: number;
    weekly: number;
  };
  share?: number;
  total_rate?: number;
  rate_avg?: number;
  favorites?: number;
  comment?: number;
  mp3_url?: string;
  amr_url?: string;
  mp3_size?: string;
  amr_size?: string;
  mp3_thumbnail?: string;
  lec_img?: string;
  mp3_duration?: string;
  mp3_description?: string;
  mp3_share_url?: string;
  cat_name?: string;
  key_name?: string;
  user_id?: number;
  is_private?: number;
}

export type ChartPeriod = 'daily' | 'weekly' | 'monthly';

const normalizeAlbumChartItem = (item: any): ChartItem => ({
  _id: item._id,
  post_date: item.post_date,
  id: item.id,
  hashed: item.hashed,
  name: item.name,
  img: item.img,
  alb_thumbnail: item.alb_thumbnail,
  lec_no: item.lec_no,
  rp_id: item.rp_id,
  reciter_id: item.reciter_id,
  lang_id: item.lang_id,
  categories: item.categories,
  Keywords: item.Keywords,
  language: item.language,
  status: item.status,
  views: item.views,
  downloads: item.downloads,
  key_id: item.key_id,
  album_image: item.album_image,
  charts: item.charts,
  share: item.share,
});

const normalizeLecturerChartItem = (item: any): ChartItem => ({
  _id: item._id,
  id: item.id || Math.random(),
  name: item.name,
  img: item.img,
  rp_thumbnail: item.rp_thumbnail,
  status: item.status,
  lang_id: item.lang_id,
  language: item.language,
  share: item.share,
  charts: item.charts,
  views: item.views,
  favorites: item.favorites,
  comment: item.comment,
});

const normalizePlaylistChartItem = (item: any): ChartItem => ({
  _id: item._id,
  id: item.id,
  name: item.name,
  user_id: item.user_id,
  is_private: item.is_private,
  charts: item.charts,
  views: item.views,
  share: item.share,
});

const normalizeLectureChartItem = (item: any): ChartItem => ({
  _id: item._id,
  post_date: item.updated_date,
  id: item.id,
  hashed: item.hashed,
  status: item.status,
  album_id: item.album_id,
  rp_id: item.rp_id,
  lang_id: item.lang_id,
  key_id: item.key_id,
  categories: item.cat_name,
  Keywords: item.key_name,
  mp3_title: item.mp3_title,
  mp3_url: item.mp3_url,
  amr_url: item.amr_url,
  mp3_size: item.mp3_size,
  amr_size: item.amr_size,
  mp3_thumbnail: item.mp3_thumbnail,
  lec_img: item.lec_img,
  lec_thumbnail: item.lec_thumbnail,
  mp3_duration: item.mp3_duration,
  mp3_description: item.mp3_description,
  mp3_share_url: item.mp3_share_url,
  img: item.img,
  total_rate: item.total_rate,
  rate_avg: item.rate_avg,
  views: item.views,
  downloads: item.downloads,
  charts: item.charts,
  share: item.share,
  favorites: item.favorites,
  comment: item.comment,
  reciter_id: item.reciter_id,
});

export const fetchAlbumCharts = async (period: ChartPeriod): Promise<ChartItem[]> => {
  const response = await fetch(`${BASE_URL}albumlisting_charts_api.php?action=${period}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.data.map(normalizeAlbumChartItem);
};

export const fetchLecturerCharts = async (period: ChartPeriod): Promise<ChartItem[]> => {
  const response = await fetch(`${BASE_URL}rplisting_charts_api.php?action=${period}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.data.map(normalizeLecturerChartItem);
};

export const fetchPlaylistCharts = async (period: ChartPeriod): Promise<ChartItem[]> => {
  const response = await fetch(`${BASE_URL}playlist_charts_api.php?action=${period}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  const playlistData = Array.isArray(data) ? data : data.data;
  if (!Array.isArray(playlistData)) {
    console.error('Playlist API did not return an array:', data);
    return [];
  }
  return playlistData.map(normalizePlaylistChartItem);
};

export const fetchLectureCharts = async (period: ChartPeriod): Promise<ChartItem[]> => {
  const response = await fetch(`${BASE_URL}leclisting_charts_api.php?action=${period}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.data.map(normalizeLectureChartItem);
};
