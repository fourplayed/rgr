import React, { memo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

export interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  selectedColor?: string;
}

export const FilterChip = memo(function FilterChip({ label, isSelected, onPress, selectedColor }: FilterChipProps) {
  const bgColor = isSelected ? (selectedColor || colors.electricBlue) : colors.surface;
  const textColor = isSelected ? colors.textInverse : colors.text;
  const borderColor = isSelected ? 'transparent' : colors.border;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: textColor,
            fontFamily: isSelected ? 'Lato_700Bold' : 'Lato_400Regular',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
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
