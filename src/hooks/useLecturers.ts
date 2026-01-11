/**
 * Custom hook for fetching lecturers
 */

import { useState, useEffect, useCallback } from 'react';
import { lecturersApi , Lecturer } from '../services/api/lecturers.api';

export interface LecturerCard {
  id: string;
  name: string;
  imageUrl: string;
  bio?: string;
  totalLectures: number;
  totalAlbums: number;
  followers: number;
  language?: string;
  verified?: boolean;
}

export function useLecturers(limit = 12) {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [lecturerCards, setLecturerCards] = useState<LecturerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Convert API lecturer to card format
   */
  const convertToCard = useCallback((lecturer: Lecturer): LecturerCard => {
    return {
      id: String(lecturer.id || ''),
      name: lecturer.name || 'Unknown Lecturer',
      imageUrl: lecturer.rp_thumbnail || lecturer.img || '',
      bio: lecturer.bio || '',
      totalLectures: lecturer.total_lectures || 0,
      totalAlbums: 0, // Not provided by API
      followers: lecturer.followers || lecturer.views || 0,
      language: lecturer.language,
      verified: lecturer.verified || (lecturer.views && lecturer.views > 1000), // Verified if > 1000 views
    };
  }, []);

  /**
   * Fetch lecturers
   */
  const fetchLecturers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const lecturersData = await lecturersApi.getLecturersForSlider(limit);

      console.log(`👥 Fetched ${lecturersData.length} lecturers`);

      setLecturers(lecturersData);

      // Convert to card format
      const cards = lecturersData.map(convertToCard);
      setLecturerCards(cards);
    } catch (err) {
      console.error('Failed to fetch lecturers:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch lecturers'));

      // Return empty arrays on error
      setLecturers([]);
      setLecturerCards([]);
    } finally {
      setLoading(false);
    }
  }, [limit, convertToCard]);

  /**
   * Fetch on mount
   */
  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  /**
   * Refresh function
   */
  const refresh = useCallback(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  return {
    lecturers,
    lecturerCards,
    loading,
    error,
    refresh,
  };
}