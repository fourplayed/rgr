import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MaintenancePriority } from '@rgr/shared';
import { MaintenancePriorityLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface MaintenancePriorityBadgeProps {
  priority: MaintenancePriority;
}

const getPriorityColor = (priority: MaintenancePriority): string => {
  return colors.maintenancePriority[priority as keyof typeof colors.maintenancePriority] ?? colors.textSecondary;
};

function MaintenancePriorityBadgeComponent({ priority }: MaintenancePriorityBadgeProps) {
  const backgroundColor = getPriorityColor(priority);
  const label = MaintenancePriorityLabels[priority] || priority;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export const MaintenancePriorityBadge = memo(MaintenancePriorityBadgeComponent);

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
