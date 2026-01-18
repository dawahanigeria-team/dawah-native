import { designTokens } from "../theme/designTokens";

// Generate consistent colors based on string hash
export const getPlaceholderColor = (id: string | undefined): string => {
  // Fallback if id is undefined or empty
  if (!id || typeof id !== 'string') {
    return designTokens.colors.palette.placeholderDefault;
  }

  const hash = id.split("").reduce((a, b) => {
    a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
    return a;
  }, 0);

  // Use a more sophisticated color palette inspired by iOS
  const colors = designTokens.colors.palette.placeholder;

  return colors[Math.abs(hash) % colors.length];
};

// Generate initials from title
export const getInitials = (title: string): string => {
  if (!title) return "?";

  const words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return title.charAt(0).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

// Generate a more sophisticated placeholder component
export const getPlaceholderStyle = (id: string | undefined, size: number) => {
  const color = getPlaceholderColor(id);

  return {
    width: size,
    height: size,
    backgroundColor: color,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: designTokens.borderRadius.lg,
    // Add subtle gradient effect
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  };
};
