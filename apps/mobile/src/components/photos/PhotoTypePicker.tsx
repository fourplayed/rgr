import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

/** Photo types matching the database enum */
export type PhotoType = 'freight' | 'damage' | 'inspection' | 'general';

interface PhotoTypeOption {
  value: PhotoType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const PHOTO_TYPE_OPTIONS: PhotoTypeOption[] = [
  {
    value: 'freight',
    label: 'Freight',
    icon: 'cube-outline',
    description: 'Load analysis',
  },
  {
    value: 'damage',
    label: 'Damage',
    icon: 'warning-outline',
    description: 'Report damage',
  },
  {
    value: 'inspection',
    label: 'Inspection',
    icon: 'clipboard-outline',
    description: 'Safety check',
  },
  {
    value: 'general',
    label: 'General',
    icon: 'image-outline',
    description: 'Other',
  },
];

interface PhotoTypePickerProps {
  selected: PhotoType;
  onChange: (type: PhotoType) => void;
  disabled?: boolean;
}

export function PhotoTypePicker({
  selected,
  onChange,
  disabled = false,
}: PhotoTypePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photo Type</Text>
      <View style={styles.optionsRow}>
        {PHOTO_TYPE_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => !disabled && onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              accessibilityLabel={`${option.label}: ${option.description}`}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={isSelected ? colors.electricBlue : colors.textSecondary}
              />
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '10', // 10% opacity
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  optionLabelSelected: {
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },
});
