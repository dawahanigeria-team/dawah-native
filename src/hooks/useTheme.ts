import { useMemo } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { colorsDark, colorsLight, designTokens } from '../theme/designTokens';

/**
 * Hook to access the current theme colors and state.
 * Replaces direct usage of designTokens.colors.
 */
export const useTheme = () => {
  const { isDark, toggleTheme, setTheme } = useThemeStore();

  const colors = useMemo(() => {
    return isDark ? colorsDark : colorsLight;
  }, [isDark]);

  return {
    colors,
    isDark,
    toggleTheme,
    setTheme,
    // Re-export other tokens for convenience
    spacing: designTokens.spacing,
    typography: designTokens.typography,
    borderRadius: designTokens.borderRadius,
    shadows: designTokens.shadows,
    hitTargets: designTokens.hitTargets,
    animations: designTokens.animations,
    zIndex: designTokens.zIndex,
    breakpoints: designTokens.breakpoints,
  };
};

/**
 * Helper hook to just get colors if you don't need the toggle functions
 */
export const useThemeColors = () => {
  const { isDark } = useThemeStore();
  return isDark ? colorsDark : colorsLight;
};

/**
 * Hook to generate text styles dynamic to the current theme
 */
export const useTextStyle = (
  variant: keyof typeof designTokens.typography.fontSize = 'body',
  colorVariant: 'label' | 'secondaryLabel' | 'tertiaryLabel' | 'quaternaryLabel' | 'systemBlue' | 'systemGreen' | 'systemRed' | 'brand' = 'label',
  weight?: keyof typeof designTokens.typography.fontWeight,
  align?: 'left' | 'center' | 'right' | 'auto'
) => {
  const colors = useThemeColors();
  
  return useMemo(() => {
    // 1. Base Typography Style
    const baseStyle = {
      fontFamily: designTokens.typography.fontFamily.system,
      fontSize: designTokens.typography.fontSize[variant],
      lineHeight: designTokens.typography.fontSize[variant] * 
        (variant.startsWith('title') || variant === 'largeTitle' 
          ? designTokens.typography.lineHeight.tight 
          : designTokens.typography.lineHeight.normal),
    };

    // 2. Color Style
    let colorValue;
    switch (colorVariant) {
      case 'label': colorValue = colors.system.label.primary; break;
      case 'secondaryLabel': colorValue = colors.system.label.secondary; break;
      case 'tertiaryLabel': colorValue = colors.system.label.tertiary; break;
      case 'quaternaryLabel': colorValue = colors.system.label.quaternary; break;
      case 'systemBlue': colorValue = colors.semantic.blue; break;
      case 'systemGreen': colorValue = colors.semantic.green; break;
      case 'systemRed': colorValue = colors.semantic.red; break;
      case 'brand': colorValue = colors.brand.primary; break;
      default: colorValue = colors.system.label.primary;
    }

    // 3. Weight Style
    const weightValue = weight ? designTokens.typography.fontWeight[weight] : undefined;
    // Apply default weights for headings if not specified
    const finalWeight = weightValue || (
      ['largeTitle', 'title1', 'title2', 'title3', 'headline'].includes(variant) 
        ? designTokens.typography.fontWeight.semibold 
        : designTokens.typography.fontWeight.regular
    );

    // 4. Align Style
    const alignStyle = align && align !== 'auto' ? { textAlign: align } : {};

    return {
      ...baseStyle,
      color: colorValue,
      fontWeight: finalWeight,
      ...alignStyle,
    };
  }, [colors, variant, colorVariant, weight, align]);
};
