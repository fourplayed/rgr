import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface MaintenanceCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function MaintenanceCheckbox({
  checked,
  onChange,
  disabled = false,
}: MaintenanceCheckboxProps) {
  return (
    <TouchableOpacity
      style={[styles.container, checked && styles.containerChecked, disabled && styles.disabled]}
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel="Report defect"
      accessibilityHint="Creates a maintenance request for a defective asset"
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={checked ? "warning" : "warning-outline"}
          size={24}
          color={checked ? colors.warning : colors.textSecondary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, checked && styles.labelChecked]}>Report Defect</Text>
        <Text style={styles.description}>
          Creates a maintenance request for a defective asset. Upon confirmation, details describing the defect will be requested.
        </Text>
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && (
          <Ionicons name="checkmark" size={14} color={colors.textInverse} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  containerChecked: {
    borderColor: colors.warning,
    backgroundColor: colors.warning + '10',
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  labelChecked: {
    color: colors.warning,
  },
  description: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
});
