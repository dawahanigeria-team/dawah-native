import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import tw from '../../theme/twrnc';
import { Skeleton } from '../atoms';

interface LecturerCardSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const LecturerCardSkeleton: React.FC<LecturerCardSkeletonProps> = ({ style }) => {
  return (
    <View style={[tw`items-center mr-6`, style]}>
      {/* Avatar */}
      <Skeleton
        width={80}
        height={80}
        variant="circle"
        style={tw`mb-2`}
      />

      {/* Name */}
      <Skeleton
        width="80%"
        height={14}
        style={tw`mb-1`}
      />

      {/* Language Badge */}
      <Skeleton
        width="40%"
        height={12}
        style={tw`mb-1`}
      />

      {/* Stats */}
      <Skeleton
        width="60%"
        height={12}
      />
    </View>
  );
};
