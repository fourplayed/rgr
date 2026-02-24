import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AssetStatusColors, AssetStatusLabels } from '@rgr/shared';
import type { AssetStatus } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface StatusBadgeProps {
  status: AssetStatus;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const color = AssetStatusColors[status];
  const label = AssetStatusLabels[status];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color },
        size === 'small' && styles.badgeSmall,
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
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
