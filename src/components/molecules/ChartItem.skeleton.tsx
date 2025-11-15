import React from 'react';
import { View, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/designTokens';
import { Skeleton } from '../atoms';

interface ChartItemSkeletonProps {
  style?: ViewStyle;
}

export const ChartItemSkeleton: React.FC<ChartItemSkeletonProps> = ({ style }) => {
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.system.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.system.separator.primary,
  };

  return (
    <View style={[containerStyle, style]}>
      <Skeleton width={20} height={20} style={{ marginRight: designTokens.spacing.md }} />
      <Skeleton width={60} height={60} style={{ borderRadius: designTokens.borderRadius.md, marginRight: designTokens.spacing.md }} />
      <View style={{ flex: 1, marginLeft: designTokens.spacing.md }}>
        <Skeleton width="80%" height={20} />
        <Skeleton width="60%" height={15} style={{ marginTop: designTokens.spacing.xs }} />
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: designTokens.spacing.md }}>
        <Skeleton width={50} height={20} />
        <Skeleton width={70} height={15} style={{ marginTop: designTokens.spacing.xs }} />
      </View>
    </View>
  );
};
