import React from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AssetStatusColors, AssetStatusLabels } from '@rgr/shared';
import type { AssetStatus } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface AssetStatusFilterChipsProps {
  selectedStatuses: AssetStatus[];
  onToggleStatus: (status: AssetStatus) => void;
}

const AVAILABLE_STATUSES: AssetStatus[] = [
  'serviced',
  'maintenance',
  'out_of_service',
];

export const AssetStatusFilterChips = React.memo(function AssetStatusFilterChips({ selectedStatuses, onToggleStatus }: AssetStatusFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {AVAILABLE_STATUSES.map((status) => {
        const isSelected = selectedStatuses.includes(status);
        const statusColor = AssetStatusColors[status];
        const label = AssetStatusLabels[status];

        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.chip,
              isSelected && { backgroundColor: statusColor },
            ]}
            onPress={() => onToggleStatus(status)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${label} filter`}
            accessibilityHint={isSelected ? `Double tap to remove ${label} filter` : `Double tap to add ${label} filter`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  labelSelected: {
    color: colors.textInverse,
    fontFamily: 'Lato_700Bold',
  },
});
