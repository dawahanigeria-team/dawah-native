import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface TouchableProps extends Omit<PressableProps, 'style'> {
  hapticFeedback?: boolean;
  scaleOnPress?: boolean;
  scaleValue?: number;
  minHitTarget?: boolean;
  children: React.ReactNode;
  style?: ViewStyle | ((state: { pressed: boolean }) => ViewStyle);
}

export const Touchable: React.FC<TouchableProps> = memo(({
  hapticFeedback = true,
  scaleOnPress = true,
  scaleValue = 0.98,
  minHitTarget = true,
  disabled,
  children,
  style,
  onPress,
  ...props
}) => {
  const handlePress = (event: any) => {
    if (!disabled) {
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(event);
    }
  };

  const baseStyle: ViewStyle = {
    minHeight: minHitTarget ? designTokens.hitTargets.minimum : undefined,
    minWidth: minHitTarget ? designTokens.hitTargets.minimum : undefined,
  };

  // Pass a style function to Pressable so the consumer's function-based style
  // receives the synchronous { pressed } state on every render frame,
  // matching the native Pressable contract.
  const combinedStyle = ({ pressed }: { pressed: boolean }) => [
    baseStyle,
    typeof style === 'function' ? style({ pressed }) : style,
    // Keep the public press-feedback options without animation scheduling.
    pressed && scaleOnPress && !disabled ? { transform: [{ scale: scaleValue }] } : undefined,
  ];

  return (
    <Pressable
      style={combinedStyle as any}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...props}
    >
      {children}
    </Pressable>
  );
});

Touchable.displayName = 'Touchable';