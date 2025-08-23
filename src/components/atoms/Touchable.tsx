import React, { memo } from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
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

  const getBaseStyle = (): ViewStyle => ({
    minHeight: minHitTarget ? designTokens.hitTargets.minimum : undefined,
    minWidth: minHitTarget ? designTokens.hitTargets.minimum : undefined,
  });

  const getPressedStyle = (pressed: boolean): ViewStyle => {
    if (!scaleOnPress || disabled) return {};
    
    return {
      transform: pressed ? [{ scale: scaleValue }] : [{ scale: 1 }],
    };
  };

  const combinedStyle = ({ pressed }: { pressed: boolean }): ViewStyle => {
    const baseStyle = getBaseStyle();
    const pressedStyle = getPressedStyle(pressed);
    
    if (typeof style === 'function') {
      return {
        ...baseStyle,
        ...style({ pressed }),
        ...pressedStyle,
      };
    }
    
    return {
      ...baseStyle,
      ...(style as ViewStyle),
      ...pressedStyle,
    };
  };

  return (
    <Pressable
      style={combinedStyle}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...props}
    >
      {children}
    </Pressable>
  );
});

Touchable.displayName = 'Touchable';