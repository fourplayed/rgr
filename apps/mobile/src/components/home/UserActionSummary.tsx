import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserActionSummary as UserActionSummaryType } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';

interface UserActionSummaryProps {
  summary: UserActionSummaryType | null;
  isLoading: boolean;
}

interface ChipConfig {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  count: number;
  label: string;
}

export function UserActionSummary({ summary, isLoading }: UserActionSummaryProps) {
  if (isLoading || !summary) return null;

  const allChips: ChipConfig[] = [
    {
      key: 'scans',
      icon: 'qr-code' as const,
      color: colors.electricBlue,
      count: summary.scansPerformed,
      label: 'Scans',
    },
    {
      key: 'defects',
      icon: 'warning' as const,
      color: colors.defectYellow,
      count: summary.defectsReported,
      label: 'Defects',
    },
    {
      key: 'reported',
      icon: 'construct' as const,
      color: colors.warning,
      count: summary.maintenanceReported,
      label: 'Reported',
    },
    {
      key: 'completed',
      icon: 'checkmark-circle' as const,
      color: colors.success,
      count: summary.maintenanceCompleted,
      label: 'Completed',
    },
  ];
  const chips = allChips.filter((c) => c.count > 0);

  const totalActions =
    summary.scansPerformed +
    summary.defectsReported +
    summary.maintenanceReported +
    summary.maintenanceCompleted;

  return (
    <View style={styles.container}>
      <AppText style={styles.sectionTitle}>Your Last 24 Hours</AppText>
      {totalActions === 0 ? (
        <AppText style={styles.emptyText}>No activity in the last 24 hours</AppText>
      ) : (
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <View key={chip.key} style={[styles.chip, { backgroundColor: `${chip.color}26` }]}>
              <Ionicons name={chip.icon} size={14} color={chip.color} />
              <AppText style={[styles.chipCount, { color: chip.color }]}>{chip.count}</AppText>
              <AppText style={[styles.chipLabel, { color: chip.color }]}>{chip.label}</AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
  },
  chipCount: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
  },
  chipLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textDisabled,
  },
});
