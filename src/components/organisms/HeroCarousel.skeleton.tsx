import React from "react";
import { View, useWindowDimensions } from "react-native";
import { designTokens } from "src/theme/designTokens";
import { Skeleton } from "../atoms/Skeleton";


export const HeroCarouselSkeleton = () => {
  // useWindowDimensions, not a module-scope Dimensions.get(): the old
  // value was captured at import and never updated on rotation or resize.
  const { width: screenWidth } = useWindowDimensions();
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
