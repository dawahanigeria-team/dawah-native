import { Platform } from 'react-native';
import { designTokens } from '../theme/designTokens';

/**
 * Base height for the tab bar based on platform standards
 * iOS: 49 (Standard)
 * Android: 56 (Material Design)
 */
export const TAB_BAR_BASE_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

/**
 * Minimum padding at the bottom of the tab bar.
 * Using spacing.lg (16px) to align with the 4-point grid system
 * and ensure comfortable touch targets on all devices.
 */
export const TAB_BAR_MIN_PADDING_BOTTOM = designTokens.spacing.lg;

/**
 * Calculates the adaptive padding bottom for the tab bar
 * @param bottomInset The bottom inset from safe area context
 * @returns The calculated padding bottom
 */
export const getTabBarPaddingBottom = (bottomInset: number): number => {
  return Math.max(bottomInset, TAB_BAR_MIN_PADDING_BOTTOM);
};

/**
 * Calculates the total height of the tab bar including adaptive padding
 * @param bottomInset The bottom inset from safe area context
 * @returns The total height of the tab bar
 */
export const getTabBarHeight = (bottomInset: number): number => {
  return TAB_BAR_BASE_HEIGHT + getTabBarPaddingBottom(bottomInset);
};
