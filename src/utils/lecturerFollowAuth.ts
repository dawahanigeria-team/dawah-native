export const buildLecturerFollowReturnTo = (lecturerId: string | number): string => {
  return `/lecturer/${lecturerId}?autoFollow=1`;
};

export const buildReciterFollowReturnTo = (reciterId: string | number): string => {
  return `/quran-reciter/${reciterId}?autoFollow=1`;
};

export const parseAutoFollowFlag = (value?: string | string[]): boolean => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};
