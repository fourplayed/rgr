import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole, UserRoleLabels, UserRoleDescriptions } from '@rgr/shared';
import { BottomSheet } from '../common/BottomSheet';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { getUserRoleColor } from '../../utils/getUserRoleColor';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { AppText } from '../common';

const ROLES: UserRole[] = ['driver', 'mechanic', 'manager', 'superuser'];

interface UserRolePickerProps {
  visible: boolean;
  currentRole: UserRole;
  onSelect: (role: UserRole) => void;
  onCancel: () => void;
}

export function UserRolePicker({ visible, currentRole, onSelect, onCancel }: UserRolePickerProps) {
  const sheetBottomPadding = useSheetBottomPadding();

  return (
    <BottomSheet visible={visible} onDismiss={onCancel}>
      <View style={[styles.content, { paddingBottom: sheetBottomPadding }]}>
        <AppText style={styles.title}>Change Role</AppText>

        {ROLES.map((role) => {
          const isSelected = role === currentRole;
          const roleColor = getUserRoleColor(role) ?? colors.backgroundDark;

          return (
            <TouchableOpacity
              key={role}
              style={[styles.option, isSelected && { borderColor: roleColor, borderWidth: 2 }]}
              onPress={() => onSelect(role)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${UserRoleLabels[role]}: ${UserRoleDescriptions[role]}`}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                <AppText style={styles.roleLabel}>{UserRoleLabels[role]}</AppText>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={roleColor} />}
              </View>
              <AppText style={styles.roleDescription}>{UserRoleDescriptions[role]}</AppText>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <AppText style={styles.cancelButtonText}>Cancel</AppText>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  option: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  roleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roleLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  roleDescription: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginLeft: spacing.lg,
  },
  cancelButton: {
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
});
