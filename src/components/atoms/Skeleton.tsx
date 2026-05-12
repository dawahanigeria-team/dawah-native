import React, { useEffect, useState } from "react";
import {
  DimensionValue,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { designTokens } from "../../theme/designTokens";
import {
  getInitialSkeletonContainerWidth,
  resolveSkeletonAnimationEnabled,
} from "./skeletonPerf";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: "rect" | "circle";
  style?: ViewStyle;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  variant = "rect",
  style,
  animated,
}) => {
  const animationEnabled = resolveSkeletonAnimationEnabled(animated, Platform.OS);
  const shimmer = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(
    getInitialSkeletonContainerWidth(width)
  );

  useEffect(() => {
    if (!animationEnabled) {
      shimmer.value = 0;
      return;
    }

    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [animationEnabled, shimmer]);

  useEffect(() => {
    if (typeof width === "number" && width !== containerWidth) {
      setContainerWidth(width);
    }
  }, [width, containerWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    if (!animationEnabled || typeof width === "number") return;

    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  };

  const shimmerStyle = useAnimatedStyle(() => {
    if (!animationEnabled) {
      return {};
    }

    return {
      transform: [
        {
          translateX: containerWidth
            ? interpolate(shimmer.value, [0, 1], [-containerWidth, containerWidth])
            : 0,
        },
      ],
    };
  });

  const skeletonStyle: ViewStyle = {
    width: width as DimensionValue,
    height: height as DimensionValue,
    backgroundColor: designTokens.colors.system.background.secondary,
    borderRadius:
      variant === "circle"
        ? typeof height === "number"
          ? height / 2
          : 9999
        : designTokens.borderRadius.sm,
    overflow: "hidden",
  };

  return (
    <View style={[styles.skeleton, skeletonStyle, style]} onLayout={handleLayout}>
      {animationEnabled && containerWidth > 0 && (
        <AnimatedLinearGradient
          colors={["transparent", "rgba(255,255,255,0.15)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.shimmer, shimmerStyle]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    position: "relative",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});
