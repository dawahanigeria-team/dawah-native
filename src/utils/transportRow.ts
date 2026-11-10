import type Ionicons from '@expo/vector-icons/Ionicons';

export type RepeatMode = 'off' | 'all' | 'one';
export type IconName = keyof typeof Ionicons.glyphMap;

export const SKIP_BACK_SECONDS = 15;
export const SKIP_FORWARD_SECONDS = 30;

export interface TransportButton {
  id: 'shuffle' | 'skipBack' | 'skipForward' | 'repeat';
  side: 'left' | 'right';
  icon: IconName;
  caption: string;
  accessibilityLabel: string;
  active: boolean;
  enabled: boolean;
  visible: boolean;
  onPress: () => void;
}

export interface TransportInput {
  repeatMode: RepeatMode;
  isShuffled: boolean;
  queueLength: number;
  isCurrentLecture: boolean;
  onShuffle: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSetRepeat: (mode: RepeatMode) => void;
}

const REPEAT_ORDER: RepeatMode[] = ['off', 'all', 'one'];

export const nextRepeatMode = (mode: RepeatMode): RepeatMode =>
  REPEAT_ORDER[(REPEAT_ORDER.indexOf(mode) + 1) % REPEAT_ORDER.length];

const REPEAT_WORDS: Record<RepeatMode, string> = {
  off: 'Off',
  all: 'All',
  one: 'One',
};

const REPEAT_SPOKEN: Record<RepeatMode, string> = {
  off: 'Repeat is off. Double tap to repeat the whole queue.',
  all: 'Repeating the whole queue. Double tap to repeat this lecture.',
  one: 'Repeating this lecture. Double tap to turn repeat off.',
};

export const buildTransportRow = (input: TransportInput): TransportButton[] => {
  const { repeatMode, isShuffled, queueLength, isCurrentLecture } = input;

  return [
    {
      id: 'shuffle',
      side: 'left',
      icon: 'shuffle',
      caption: isShuffled ? 'On' : 'Off',
      accessibilityLabel: isShuffled
        ? 'Shuffle is on. Double tap to turn it off.'
        : 'Shuffle is off. Double tap to turn it on.',
      active: isShuffled,
      enabled: true,
      visible: isCurrentLecture && queueLength >= 2,
      onPress: input.onShuffle,
    },
    {
      id: 'skipBack',
      side: 'left',
      icon: 'arrow-undo-outline',
      caption: `${SKIP_BACK_SECONDS}s`,
      accessibilityLabel: `Skip back ${SKIP_BACK_SECONDS} seconds`,
      active: false,
      enabled: isCurrentLecture,
      visible: true,
      onPress: input.onSkipBack,
    },
    {
      id: 'skipForward',
      side: 'right',
      icon: 'arrow-redo-outline',
      caption: `${SKIP_FORWARD_SECONDS}s`,
      accessibilityLabel: `Skip forward ${SKIP_FORWARD_SECONDS} seconds`,
      active: false,
      enabled: isCurrentLecture,
      visible: true,
      onPress: input.onSkipForward,
    },
    {
      id: 'repeat',
      side: 'right',
      icon: 'repeat',
      caption: REPEAT_WORDS[repeatMode],
      accessibilityLabel: REPEAT_SPOKEN[repeatMode],
      active: repeatMode !== 'off',
      enabled: true,
      visible: true,
      onPress: () => input.onSetRepeat(nextRepeatMode(repeatMode)),
    },
  ];
};
