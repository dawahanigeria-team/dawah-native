// Color palette for image placeholders
const placeholderColors = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#DC2626', // Red
  '#059669', // Emerald
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#C2410C', // Orange
  '#15803D', // Green
  '#9333EA', // Purple
  '#DB2777', // Pink
  '#0F766E', // Teal
  '#7F1D1D', // Dark Red
];

export const getPlaceholderColor = (id: string): string => {
  // Generate a consistent color based on the ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % placeholderColors.length;
  return placeholderColors[index];
};

export const getInitials = (title: string): string => {
  return title
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};