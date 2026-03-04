import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AssetStatusColors, AssetStatusLabels } from '@rgr/shared';
import type { AssetStatus } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

type BadgeSize = 'small' | 'medium';

/** Generic badge — accepts any label + color. Used as the base for all domain-specific badges. */
interface BadgeProps {
  label: string;
  color: string;
  size?: BadgeSize;
}

export function Badge({ label, color, size = 'small' }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color },
        size === 'small' && styles.badgeSmall,
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.label,
          size === 'small' && styles.labelSmall,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/** Asset status badge — resolves color and label from AssetStatus enum. */
interface StatusBadgeProps {
  status: AssetStatus;
  size?: BadgeSize;
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  return (
    <Badge
      label={AssetStatusLabels[status]}
      color={AssetStatusColors[status]}
      size={size}
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
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: fontSize.xs,
  },
});
