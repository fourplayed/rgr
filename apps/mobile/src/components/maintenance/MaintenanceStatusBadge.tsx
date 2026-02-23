import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MaintenanceStatus } from '@rgr/shared';
import { MaintenanceStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
}

const getStatusColor = (status: MaintenanceStatus): string => {
  return colors.maintenanceStatus[status as keyof typeof colors.maintenanceStatus] || colors.textSecondary;
};

function MaintenanceStatusBadgeComponent({ status }: MaintenanceStatusBadgeProps) {
  const backgroundColor = getStatusColor(status);
  const label = MaintenanceStatusLabels[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export const MaintenanceStatusBadge = memo(MaintenanceStatusBadgeComponent);

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
