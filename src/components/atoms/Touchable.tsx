import React, { memo, useCallback, useState } from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { designTokens } from '../../theme/designTokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const springConfig = { damping: 15, stiffness: 150 };

  const handlePressIn = useCallback(() => {
    setPressed(true);
    if (scaleOnPress && !disabled) {
      scale.value = withSpring(scaleValue, springConfig);
    }
  }, [scaleOnPress, disabled, scaleValue]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    if (scaleOnPress && !disabled) {
      scale.value = withSpring(1, springConfig);
    }
  }, [scaleOnPress, disabled]);

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

  const resolvedStyle: ViewStyle = typeof style === 'function'
    ? { ...baseStyle, ...style({ pressed }) }
    : { ...baseStyle, ...(style as ViewStyle) };

  return (
    <AnimatedPressable
      style={[resolvedStyle, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
});

Touchable.displayName = 'Touchable';