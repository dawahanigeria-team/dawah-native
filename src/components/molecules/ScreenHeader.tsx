import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useBackOrHome } from '../../navigation/useBackOrHome';
import { borderRadius, hitTargets, spacing } from '../../theme/designTokens';
import { Text } from '../atoms/Text';

type IconName = keyof typeof Ionicons.glyphMap;
type Colors = ReturnType<typeof useTheme>['colors'];

export type HeaderAction = {
  accessibilityLabel: string;
  onPress: () => void;
  /** `true` draws a dot; a number draws a count and is read out with the label. */
  badge?: number | boolean;
  disabled?: boolean;
} & ({ icon: IconName; label?: never } | { label: string; icon?: never });

interface Shared {
  title?: string;
  subtitle?: string;
  actions?: readonly HeaderAction[];
}

export type ScreenHeaderProps =
  /** Pushed screens: back button, one-line title, optional actions. */
  | (Shared & { variant?: 'inline'; onBack?: () => void })
  /** Tab roots: no back button, large title under the action row. */
  | (Shared & { variant: 'large'; title: string })
  /** Floats over hero artwork: scrim buttons, no background, absolutely positioned. */
  | (Shared & { variant: 'overlay'; onBack?: () => void });

const BACK_ICON: IconName = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back';
const ICON_SIZE = 24;

const badgeText = (badge: number) => (badge > 99 ? '99+' : String(badge));

export const actionAccessibilityLabel = (action: HeaderAction): string =>
  typeof action.badge === 'number' && action.badge > 0
    ? `${action.accessibilityLabel}, ${action.badge} new`
    : action.accessibilityLabel;

const IconButton: React.FC<{
  icon?: IconName;
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  badge?: number | boolean;
  disabled?: boolean;
  onScrim: boolean;
  colors: Colors;
}> = ({ icon, label, accessibilityLabel, onPress, badge, disabled = false, onScrim, colors }) => {
  const showBadge = badge === true || (typeof badge === 'number' && badge > 0);
  const tint = onScrim ? colors.fixed.white : colors.system.label.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        label ? styles.textButton : styles.iconButton,
        onScrim && { backgroundColor: colors.overlay.darkMedium },
        pressed && { opacity: 0.6 },
      ]}
    >
      {label ? (
        <Text
          variant="body"
          weight="semibold"
          numberOfLines={1}
          style={{ color: disabled ? colors.system.label.tertiary : onScrim ? tint : colors.brand.primary }}
        >
          {label}
        </Text>
      ) : (
        <Ionicons name={icon} size={ICON_SIZE} color={disabled ? colors.system.label.tertiary : tint} />
      )}
      {showBadge && (
        <View
          style={[
            typeof badge === 'number' ? styles.countBadge : styles.dotBadge,
            { backgroundColor: colors.semantic.red },
          ]}
        >
          {typeof badge === 'number' && (
            <Text variant="caption2" weight="bold" style={{ color: colors.fixed.white }} maxFontSizeMultiplier={1.2}>
              {badgeText(badge)}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = (props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const backOrHome = useBackOrHome();
  const { title, subtitle, actions = [] } = props;
  const onScrim = props.variant === 'overlay';
  const onBack = props.variant === 'large' ? undefined : (props.onBack ?? backOrHome);

  const actionButtons = actions.map((action) => (
    <IconButton
      key={action.accessibilityLabel}
      icon={action.icon}
      label={action.label}
      accessibilityLabel={actionAccessibilityLabel(action)}
      onPress={action.onPress}
      badge={action.badge}
      disabled={action.disabled}
      onScrim={onScrim}
      colors={colors}
    />
  ));

  if (props.variant === 'large') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.system.background.primary }]}>
        {actionButtons.length > 0 && <View style={[styles.bar, styles.trailingBar]}>{actionButtons}</View>}
        <View style={[styles.largeTitleBlock, actionButtons.length === 0 && styles.largeTopGap]}>
          <Text variant="largeTitle" weight="bold" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="subheadline" color="secondaryLabel" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents={onScrim ? 'box-none' : 'auto'}
      style={[
        styles.container,
        { paddingTop: insets.top },
        onScrim ? styles.overlay : { backgroundColor: colors.system.background.primary },
      ]}
    >
      <View style={styles.bar} pointerEvents="box-none">
        {onBack && (
          <IconButton icon={BACK_ICON} accessibilityLabel="Go back" onPress={onBack} onScrim={onScrim} colors={colors} />
        )}
        <View style={styles.titleBlock} pointerEvents="none">
          {title ? (
            <Text
              variant="title3"
              weight="bold"
              accessibilityRole="header"
              numberOfLines={1}
              style={onScrim ? { color: colors.fixed.white } : undefined}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              variant="footnote"
              color="secondaryLabel"
              numberOfLines={1}
              style={onScrim ? { color: colors.fixed.white } : undefined}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actionButtons}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  bar: {
    minHeight: hitTargets.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trailingBar: {
    justifyContent: 'flex-end',
  },
  largeTitleBlock: {
    paddingHorizontal: spacing.sm,
  },
  largeTopGap: {
    paddingTop: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
  },
  textButton: {
    minWidth: hitTargets.minimum,
    height: hitTargets.minimum,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: hitTargets.minimum,
    height: hitTargets.minimum,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: borderRadius.full,
  },
  countBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: 0,
    minWidth: spacing.xl,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
});
