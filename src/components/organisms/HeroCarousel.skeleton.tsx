import React from "react";
import { View, Dimensions } from "react-native";
import { designTokens } from "src/theme/designTokens";
import { Skeleton } from "../atoms";

const { width: screenWidth } = Dimensions.get("window");

export const HeroCarouselSkeleton = () => {
  const CARD_WIDTH = screenWidth - designTokens.spacing.lg * 2;
  const CARD_HEIGHT = 220;

  return (
    <View style={{ marginBottom: designTokens.spacing["4xl"], paddingHorizontal: designTokens.spacing.lg }}>
      <Skeleton width={CARD_WIDTH} height={CARD_HEIGHT} style={{ borderRadius: designTokens.borderRadius["2xl"] }} />
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: designTokens.spacing.lg }}>
        {[...Array(5)].map((_, index) => (
          <Skeleton
            key={index}
            width={designTokens.spacing.sm}
            height={designTokens.spacing.sm}
            variant="circle"
            style={{ marginHorizontal: designTokens.spacing.xs }}
          />
        ))}
      </View>
    </View>
  );
};
