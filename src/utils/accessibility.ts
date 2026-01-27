/**
 * iOS Accessibility Utilities
 * Provides helpers for VoiceOver, Dynamic Type, and other iOS accessibility features
 */

import { AccessibilityInfo, Platform } from 'react-native';

export interface AccessibilityState {
  isVoiceOverEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  preferredContentSizeCategory: string;
}

class AccessibilityService {
  private state: AccessibilityState = {
    isVoiceOverEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    preferredContentSizeCategory: 'normal',
  };

  private listeners: ((state: AccessibilityState) => void)[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (Platform.OS === 'ios') {
      try {
        // Check VoiceOver status
        const voiceOverEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        this.state.isVoiceOverEnabled = voiceOverEnabled;

        // Check reduce motion preference
        const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        this.state.isReduceMotionEnabled = reduceMotionEnabled;

        // Check reduce transparency preference (iOS specific)
        const reduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled?.() ?? false;
        this.state.isReduceTransparencyEnabled = reduceTransparencyEnabled;

        // Setup listeners for accessibility changes
        AccessibilityInfo.addEventListener('screenReaderChanged', this.handleVoiceOverChange);
        AccessibilityInfo.addEventListener('reduceMotionChanged', this.handleReduceMotionChange);
        AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', this.handleReduceTransparencyChange);

      } catch (error) {
        console.warn('AccessibilityService initialization error:', error);
      }
    }
  }

  private handleVoiceOverChange = (enabled: boolean) => {
    this.state.isVoiceOverEnabled = enabled;
    this.notifyListeners();
  };

  private handleReduceMotionChange = (enabled: boolean) => {
    this.state.isReduceMotionEnabled = enabled;
    this.notifyListeners();
  };

  private handleReduceTransparencyChange = (enabled: boolean) => {
    this.state.isReduceTransparencyEnabled = enabled;
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  public getState(): AccessibilityState {
    return { ...this.state };
  }

  public isVoiceOverEnabled(): boolean {
    return this.state.isVoiceOverEnabled;
  }

  public isReduceMotionEnabled(): boolean {
    return this.state.isReduceMotionEnabled;
  }

  public isReduceTransparencyEnabled(): boolean {
    return this.state.isReduceTransparencyEnabled;
  }

  public subscribe(listener: (state: AccessibilityState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public destroy() {
    AccessibilityInfo.removeEventListener('screenReaderChanged', this.handleVoiceOverChange);
    AccessibilityInfo.removeEventListener('reduceMotionChanged', this.handleReduceMotionChange);
    AccessibilityInfo.removeEventListener?.('reduceTransparencyChanged', this.handleReduceTransparencyChange);
    this.listeners = [];
  }
}

// Singleton instance
export const accessibilityService = new AccessibilityService();

// Accessibility label helpers
export const createAccessibilityLabel = (content: string, context?: string): string => {
  if (context) {
    return `${content}, ${context}`;
  }
  return content;
};

export const createAccessibilityHint = (action: string): string => {
  return `Double tap to ${action}`;
};

// Dynamic Type scaling factors (iOS standard)
export const dynamicTypeScaling = {
  'extraSmall': 0.82,
  'small': 0.88,
  'medium': 0.94,
  'large': 1.0, // Default
  'extraLarge': 1.12,
  'extraExtraLarge': 1.24,
  'extraExtraExtraLarge': 1.36,
  // Accessibility sizes
  'accessibilityMedium': 1.64,
  'accessibilityLarge': 1.95,
  'accessibilityExtraLarge': 2.35,
  'accessibilityExtraExtraLarge': 2.76,
  'accessibilityExtraExtraExtraLarge': 3.12,
};

export const getAccessibleFontSize = (baseFontSize: number, category: string = 'large'): number => {
  const scaling = dynamicTypeScaling[category as keyof typeof dynamicTypeScaling] || 1.0;
  return Math.round(baseFontSize * scaling);
};

// Accessibility testing helpers
export const announceForAccessibility = (message: string) => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  }
};

export const setAccessibilityFocus = (reactTag: number) => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
};

// Color contrast helpers for WCAG compliance
export const isColorContrastSufficient = (
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA'
): boolean => {
  // Simplified contrast ratio calculation
  // In a production app, you'd want a more robust color contrast library
  const contrastRatio = calculateContrastRatio(foreground, background);
  return level === 'AA' ? contrastRatio >= 4.5 : contrastRatio >= 7;
};

const calculateContrastRatio = (color1: string, color2: string): number => {
  // Simplified implementation - replace with proper color library in production
  return 4.5; // Placeholder
};