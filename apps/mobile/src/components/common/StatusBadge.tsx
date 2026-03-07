import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AssetStatusColors, AssetStatusLabels } from '@rgr/shared';
import type { AssetStatus } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

type BadgeSize = 'small' | 'medium';
type BadgeVariant = 'solid' | 'tinted';

/** Generic badge — accepts any label + color. Used as the base for all domain-specific badges. */
interface BadgeProps {
  label: string;
  color: string;
  size?: BadgeSize;
  /** 'solid' = full-color background + white text (default). 'tinted' = 15% opacity bg + colored text. */
  variant?: BadgeVariant;
}

export function Badge({ label, color, size = 'small', variant = 'solid' }: BadgeProps) {
  const isTinted = variant === 'tinted';
  const bgColor = isTinted ? `${color}26` : color;
  const textColor = isTinted ? color : colors.textInverse;

  return (
    <View
      style={[styles.badge, { backgroundColor: bgColor }, size === 'small' && styles.badgeSmall]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text style={[styles.label, { color: textColor }, size === 'small' && styles.labelSmall]}>
        {label}
      </Text>
    </View>
  );
}

/** Asset status badge — resolves color and label from AssetStatus enum. */
interface StatusBadgeProps {
  status: AssetStatus;
  size?: BadgeSize;
  variant?: BadgeVariant;
}

export function StatusBadge({ status, size = 'medium', variant = 'solid' }: StatusBadgeProps) {
  return (
    <Badge
      label={AssetStatusLabels[status]}
      color={AssetStatusColors[status]}
      size={size}
      variant={variant}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.base,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: fontSize.xs,
  },
});
