import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { designTokens } from '../../theme/designTokens';
import { Touchable, Text, Icon } from '../atoms';
import { usePlayerStore } from '../../stores/playerStore';
import { formatTime } from '../../utils/formatTime';

interface MiniPlayerProps {
  style?: ViewStyle;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = memo(({ style }) => {
  const { 
    currentEpisode, 
    isPlaying, 
    progress, 
    duration, 
    togglePlayPause, 
    expandPlayer 
  } = usePlayerStore();

  if (!currentEpisode) return null;

  const handlePlayPause = () => {
    togglePlayPause();
  };

  const handleExpand = () => {
    expandPlayer();
  };

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  const containerStyle: ViewStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: designTokens.zIndex.fixed,
    ...style,
  };

  const progressBarStyle: ViewStyle = {
    height: 2,
    backgroundColor: designTokens.colors.system.background.secondary,
  };

  const progressFillStyle: ViewStyle = {
    height: '100%',
    backgroundColor: designTokens.colors.brand.primary,
    width: `${progressPercentage}%`,
  };

  const contentStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    minHeight: designTokens.hitTargets.large,
  };

  const artworkStyle = {
    width: 48,
    height: 48,
    borderRadius: designTokens.borderRadius.lg,
    marginRight: designTokens.spacing.md,
  };

  const textContainerStyle: ViewStyle = {
    flex: 1,
    marginRight: designTokens.spacing.md,
  };

  const controlsStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
  };

  return (
    <View style={containerStyle}>
      {/* Progress bar */}
      <View style={progressBarStyle}>
        <View style={progressFillStyle} />
      </View>
      
      {/* Glass effect container */}
      <BlurView 
        intensity={18} 
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <View style={contentStyle}>
          {/* Artwork */}
          <Touchable 
            onPress={handleExpand}
            accessibilityLabel={`Expand player for ${currentEpisode.title}`}
            accessibilityHint="Tap to open full player"
            accessibilityRole="button"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <Image
              source={{ uri: currentEpisode.coverUrl }}
              style={artworkStyle}
              contentFit="cover"
              accessibilityIgnoresInvertColors={true}
            />
          </Touchable>
          
          {/* Text content */}
          <Touchable 
            style={textContainerStyle}
            onPress={handleExpand}
            accessibilityLabel={`Now playing: ${currentEpisode.title}`}
            accessibilityHint="Tap to expand player"
            accessibilityRole="button"
          >
            <Text 
              variant="bodySmall" 
              color="primary"
              weight="semibold"
              numberOfLines={1}
            >
              {currentEpisode.title}
            </Text>
            <Text 
              variant="caption" 
              color="muted"
              style={{ marginTop: designTokens.spacing.xs }}
            >
              {formatTime(progress)} • {formatTime(duration)}
            </Text>
          </Touchable>
          
          {/* Controls */}
          <View style={controlsStyle}>
            <Touchable 
              onPress={handlePlayPause}
              style={{
                marginRight: designTokens.spacing.md,
                padding: designTokens.spacing.sm,
              }}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              accessibilityHint={isPlaying ? 'Tap to pause playback' : 'Tap to start playback'}
              accessibilityRole="button"
            >
              <Icon 
                name={isPlaying ? 'pause' : 'play'} 
                size="xl" 
                color={designTokens.colors.brand.primary}
              />
            </Touchable>
            
            <Touchable 
              onPress={handleExpand}
              style={{ padding: designTokens.spacing.sm }}
              accessibilityLabel="Expand player"
              accessibilityHint="Tap to open full screen player"
              accessibilityRole="button"
            >
              <Icon 
                name="expand" 
                size="lg" 
                color="muted"
              />
            </Touchable>
          </View>
        </View>
      </BlurView>
      
      {/* Brand glow underline */}
      <View style={{
        height: 2,
        backgroundColor: designTokens.colors.brand.primary,
        ...designTokens.shadows.md,
        shadowColor: designTokens.colors.brand.primary,
      }} />
    </View>
  );
});

MiniPlayer.displayName = 'MiniPlayer';