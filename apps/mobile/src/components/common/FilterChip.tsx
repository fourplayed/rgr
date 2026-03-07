import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

export interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  selectedColor?: string;
}

export const FilterChip = memo(function FilterChip({
  label,
  isSelected,
  onPress,
  selectedColor,
}: FilterChipProps) {
  const bgColor = isSelected ? selectedColor || colors.electricBlue : colors.surface;
  const textColor = isSelected ? colors.textInverse : colors.text;
  const borderColor = isSelected ? 'transparent' : colors.border;

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
});
