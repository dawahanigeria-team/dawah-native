import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type AccessibilityActionEvent } from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { formatClock, positionFromTouch } from '../../utils/seekMath';
import { Text } from '../atoms';

const HIT_HEIGHT = 44;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 16;
const BUBBLE_WIDTH = 64;

interface SeekBarProps {
  position: number;
  duration: number;
  enabled: boolean;
  onSeek: (seconds: number) => void;
  onAdjust: (deltaSeconds: number) => void;
  adjustStep: number;
}

export const SeekBar: React.FC<SeekBarProps> = ({
  position,
  duration,
  enabled,
  onSeek,
  onAdjust,
  adjustStep,
}) => {
  const { colors } = useTheme();
  const [dragSeconds, setDragSeconds] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  const live = useRef({ width, duration, enabled, onSeek });
  live.current = { width, duration, enabled, onSeek };
  const startX = useRef(0);

  const responder = useMemo(() => {
    const secondsAt = (x: number) =>
      positionFromTouch(x, live.current.width, live.current.duration);

    return PanResponder.create({
      onStartShouldSetPanResponder: () => live.current.enabled && live.current.duration > 0,
      onMoveShouldSetPanResponder: () => live.current.enabled && live.current.duration > 0,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        startX.current = evt.nativeEvent.locationX;
        setDragSeconds(secondsAt(startX.current));
      },
      onPanResponderMove: (_evt, gesture) => {
        setDragSeconds(secondsAt(startX.current + gesture.dx));
      },
      onPanResponderRelease: (_evt, gesture) => {
        live.current.onSeek(secondsAt(startX.current + gesture.dx));
        setDragSeconds(null);
      },
      onPanResponderTerminate: () => setDragSeconds(null),
    });
  }, []);

  const dragging = dragSeconds !== null;
  const shown = dragging ? dragSeconds : position;
  const ratio = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const thumbX = ratio * width;
  const bubbleLeft = Math.min(Math.max(thumbX - BUBBLE_WIDTH / 2, 0), Math.max(width - BUBBLE_WIDTH, 0));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (!enabled) return;
    if (event.nativeEvent.actionName === 'increment') onAdjust(adjustStep);
    if (event.nativeEvent.actionName === 'decrement') onAdjust(-adjustStep);
  };

  return (
    <View>
      <View
        {...responder.panHandlers}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityValue={{
          min: 0,
          max: Math.floor(duration),
          now: Math.floor(Math.min(position, duration)),
          text: `${formatClock(position)} of ${formatClock(duration)}`,
        }}
        accessibilityState={{ disabled: !enabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={{ height: HIT_HEIGHT, justifyContent: 'center' }}
      >
        <View
          pointerEvents="none"
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            overflow: 'hidden',
            backgroundColor: colors.system.fill.tertiary,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${ratio * 100}%`,
              backgroundColor: colors.brand.primary,
            }}
          />
        </View>
        {dragging && (
          <>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: (HIT_HEIGHT - THUMB_SIZE) / 2,
                left: thumbX - THUMB_SIZE / 2,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: colors.brand.primary,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -26,
                left: bubbleLeft,
                width: BUBBLE_WIDTH,
                alignItems: 'center',
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: colors.system.background.secondary,
              }}
            >
              <Text variant="caption1" color="label" weight="semibold">
                {formatClock(dragSeconds)}
              </Text>
            </View>
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption2" color="tertiaryLabel">
          {formatClock(shown)}
        </Text>
        <Text variant="caption2" color="tertiaryLabel">
          {formatClock(duration)}
        </Text>
      </View>
    </View>
  );
};
