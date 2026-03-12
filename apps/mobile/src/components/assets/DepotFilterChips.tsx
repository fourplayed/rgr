import React, { memo } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../common';
import type { Depot } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sortDepotsByOrder, getDepotColor, getDepotTextColor } from '../../utils/depotDisplay';

interface DepotFilterChipsProps {
  depots: Depot[];
  selectedDepotId: string | null;
  onSelectDepot: (depotId: string | null) => void;
}

export const DepotFilterChips = memo(function DepotFilterChips({
  depots,
  selectedDepotId,
  onSelectDepot,
}: DepotFilterChipsProps) {
  const sorted = sortDepotsByOrder(depots);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {sorted.map((depot) => {
        const isSelected = depot.id === selectedDepotId;
        const chipBg = isSelected ? getDepotColor(depot) : colors.surface;
        const chipText = isSelected ? getDepotTextColor(depot) : colors.text;
        const chipBorder = isSelected ? 'transparent' : colors.border;

        return (
          <TouchableOpacity
            key={depot.id}
            style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
            onPress={() => onSelectDepot(isSelected ? null : depot.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={depot.name}
            accessibilityState={{ selected: isSelected }}
          >
            <AppText
              style={[
                styles.chipText,
                {
                  color: chipText,
                  fontFamily: isSelected ? fonts.bold : fonts.regular,
                },
              ]}
            >
              {depot.name}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  container: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
});
