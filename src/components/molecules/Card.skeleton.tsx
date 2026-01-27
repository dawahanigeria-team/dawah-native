import React from "react";
import { View, ViewStyle } from "react-native";
import { designTokens } from "src/theme/designTokens";
import { Skeleton } from "../atoms";

interface CardSkeletonProps {
  variant: "square" | "landscape" | "list" | "section";
  style?: ViewStyle;
}

const SquareSkeleton = ({ style }: { style?: ViewStyle }) => (
  <View style={[{ width: 140 }, style]}>
    <Skeleton width={140} height={140} style={{ borderRadius: designTokens.borderRadius.xl }} />
    <Skeleton width="80%" height={20} style={{ marginTop: designTokens.spacing.sm }} />
    <Skeleton width="60%" height={20} style={{ marginTop: designTokens.spacing.xs }} />
  </View>
);

const LandscapeSkeleton = ({ style }: { style?: ViewStyle }) => (
  <View
    style={[
      {
        flexDirection: "row",
        alignItems: "center",
        padding: designTokens.spacing.lg,
        marginBottom: designTokens.spacing.lg,
        backgroundColor: designTokens.colors.system.background.secondary,
        borderRadius: designTokens.borderRadius['2xl'],
        minHeight: 120,
      },
      style,
    ]}
  >
    <Skeleton width={72} height={72} style={{ borderRadius: designTokens.borderRadius.xl, marginRight: designTokens.spacing.lg }} />
    <View style={{ flex: 1 }}>
      <Skeleton width="90%" height={20} />
      <Skeleton width="70%" height={20} style={{ marginTop: designTokens.spacing.xs }} />
    </View>
    <Skeleton width={52} height={52} variant="circle" />
  </View>
);

const ListSkeleton = ({ style }: { style?: ViewStyle }) => (
  <View
    style={[
      {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: designTokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: designTokens.colors.system.separator.primary,
        minHeight: designTokens.hitTargets.large,
      },
      style,
    ]}
  >
    <Skeleton
      width={designTokens.spacing["5xl"]}
      height={designTokens.spacing["5xl"]}
      style={{ borderRadius: designTokens.borderRadius.md, marginRight: designTokens.spacing.md }}
    />
    <View style={{ flex: 1 }}>
      <Skeleton width="80%" height={20} />
      <Skeleton width="60%" height={15} style={{ marginTop: designTokens.spacing.xs }}/>
    </View>
  </View>
);

const SectionSkeleton = ({ style }: { style?: ViewStyle }) => (
  <View
    style={[
      {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: designTokens.spacing.lg,
        marginBottom: designTokens.spacing.md,
        backgroundColor: designTokens.colors.system.background.secondary,
        borderRadius: designTokens.borderRadius["2xl"],
        minHeight: 120,
      },
      style,
    ]}
  >
    <Skeleton width={80} height={80} style={{ borderRadius: designTokens.borderRadius.xl, marginRight: designTokens.spacing.lg }} />
    <View style={{ flex: 1, justifyContent: "space-between", paddingVertical: designTokens.spacing.xs }}>
      <Skeleton width="90%" height={20} />
      <Skeleton width="70%" height={20} style={{ marginTop: designTokens.spacing.sm }} />
    </View>
    <Skeleton width={48} height={48} variant="circle" style={{ marginLeft: designTokens.spacing.md }} />
  </View>
);

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ variant, style }) => {
  switch (variant) {
    case "square":
      return <SquareSkeleton style={style} />;
    case "landscape":
      return <LandscapeSkeleton style={style} />;
    case "list":
      return <ListSkeleton style={style} />;
    case "section":
      return <SectionSkeleton style={style} />;
    default:
      return <SquareSkeleton style={style} />;
  }
};
