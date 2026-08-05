import { designTokens } from "../theme/designTokens";
import { boxShadow } from "./shadow";

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
    // Add subtle gradient effect. The shadow is tinted with the placeholder's
    // own colour, so the opacity has to be folded into it — see utils/shadow.
    // elevation 3 folded in: boxShadow renders on both platforms.
    boxShadow: boxShadow(color, 0.3, 4, 2, 0),
  };
};
