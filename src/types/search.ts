export type SortOption =
  | 'followers'
  | 'views'
  | 'a-z'
  | 'z-a'
  | 'recent'   // newest post first
  | 'oldest';  // oldest post first

export type Language =
  | 'All'
  | 'English'
  | 'Hausa'
  | 'Yoruba'
  | 'Arabic'
  | 'Igbo'
  | 'Igala'
  | 'Nupe'
  | 'Ebira'
  | 'Pidgin English';

export type Surah = 'All' | 'Al-Fatiha' | 'Al-Baqarah' | 'Ali-Imran' | 'An-Nisa' | 'Al-Maidah' | 'Al-Anam' | 'Al-Araf' | 'Al-Anfal' | 'At-Tawbah' | 'Yunus' | 'Hud' | 'Yusuf' | 'Ar-Rad' | 'Ibrahim' | 'Al-Hijr' | 'An-Nahl' | 'Al-Isra' | 'Al-Kahf' | 'Maryam' | 'Ta-Ha';

export interface SearchFilters {
  language: Language;
  surah: Surah;
  sortBy: SortOption;
  lecturerId?: string;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  showFilters: boolean;
}