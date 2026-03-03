import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DefectStatus } from '@rgr/shared';
import { DefectStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface DefectStatusBadgeProps {
  status: DefectStatus;
}

const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  reported: colors.warning,
  accepted: colors.info,
  resolved: colors.success,
  dismissed: colors.textSecondary,
};

function DefectStatusBadgeComponent({ status }: DefectStatusBadgeProps) {
  const backgroundColor = DEFECT_STATUS_COLORS[status] ?? colors.textSecondary;
  const label = DefectStatusLabels[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export const DefectStatusBadge = memo(DefectStatusBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  text: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
