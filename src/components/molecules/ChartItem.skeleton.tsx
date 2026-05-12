import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Skeleton } from '../atoms/Skeleton';

interface ChartItemSkeletonProps {
  style?: ViewStyle;
}

export const ChartItemSkeleton: React.FC<ChartItemSkeletonProps> = ({ style }) => {
  const { colors, spacing, borderRadius } = useTheme();
  
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.system.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.system.separator.primary,
  };

  return (
    <View style={[containerStyle, style]}>
      <Skeleton width={20} height={20} style={{ marginRight: spacing.md }} />
      <Skeleton width={60} height={60} style={{ borderRadius: borderRadius.md, marginRight: spacing.md }} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Skeleton width="80%" height={20} />
        <Skeleton width="60%" height={15} style={{ marginTop: spacing.xs }} />
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: spacing.md }}>
        <Skeleton width={50} height={20} />
        <Skeleton width={70} height={15} style={{ marginTop: spacing.xs }} />
      </View>
    </View>
  );
};
