export type SortOption = 'followers' | 'views' | 'a-z' | 'z-a';

export type Language = 'All' | 'English' | 'Yoruba' | 'Hausa' | 'Igala' | 'Fulani' | 'Igbo';

export type Topic = 'All' | 'Faith & Creed' | 'Tafsir' | 'Charity' | 'Fajr Talk' | 'Ramadan' | 'Quran Recitation';

export type Surah = 'All' | 'Al-Fatiha' | 'Al-Baqarah' | 'Ali-Imran' | 'An-Nisa' | 'Al-Maidah' | 'Al-Anam' | 'Al-Araf' | 'Al-Anfal' | 'At-Tawbah' | 'Yunus' | 'Hud' | 'Yusuf' | 'Ar-Rad' | 'Ibrahim' | 'Al-Hijr' | 'An-Nahl' | 'Al-Isra' | 'Al-Kahf' | 'Maryam' | 'Ta-Ha';

export interface SearchFilters {
  language: Language;
  topic: Topic;
  surah: Surah;
  sortBy: SortOption;
  lecturerId?: string;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  showFilters: boolean;
}