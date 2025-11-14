import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { designTokens } from "src/theme/designTokens";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: "rect" | "circle";
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  variant = "rect",
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const skeletonStyle: ViewStyle = {
    width,
    height,
    backgroundColor: designTokens.colors.system.background.secondary,
    opacity,
    borderRadius:
      variant === "circle"
        ? typeof height === "number"
          ? height / 2
          : 9999
        : designTokens.borderRadius.sm,
  };

  return <Animated.View style={[styles.skeleton, skeletonStyle, style]} />;
};

const styles = StyleSheet.create({
  skeleton: {
    // Base styles for the skeleton
  },
});
