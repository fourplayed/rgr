import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from './AppText';

export interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  selectedColor?: string;
  /** When provided, renders a small ✕ icon and calls this on tap. Used for removable active-filter chips. */
  onRemove?: () => void;
  /** Compact sizing for active-filter strip chips. */
  compact?: boolean;
}

export const FilterChip = memo(function FilterChip({
  label,
  isSelected,
  onPress,
  selectedColor,
  onRemove,
  compact,
}: FilterChipProps) {
  const bgColor = isSelected ? selectedColor || colors.electricBlue : colors.surface;
  const textColor = isSelected ? colors.textInverse : colors.text;
  const borderColor = isSelected ? 'transparent' : colors.border;

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  const handleRemove = useCallback(() => {
    Haptics.selectionAsync();
    onRemove?.();
  }, [onRemove]);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        compact && styles.chipCompact,
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
      <AppText
        style={[styles.chipText, compact && styles.chipTextCompact, { color: textColor }]}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {onRemove && isSelected && (
        <TouchableOpacity
          onPress={handleRemove}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
          accessibilityLabel={`Remove ${label} filter`}
        >
          <View style={[styles.removeIcon, { backgroundColor: textColor }]}>
            <Ionicons name="close" size={8} color={bgColor} />
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  chipTextCompact: {
    fontSize: fontSize.xxs,
  },
  removeIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
});
