import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole, UserRoleLabels, UserRoleDescriptions } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { getUserRoleColor } from '../../utils/getUserRoleColor';

const ROLES: UserRole[] = ['driver', 'mechanic', 'manager', 'superuser'];

interface UserRolePickerProps {
  visible: boolean;
  currentRole: UserRole;
  onSelect: (role: UserRole) => void;
  onCancel: () => void;
}

export function UserRolePicker({ visible, currentRole, onSelect, onCancel }: UserRolePickerProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <Text style={styles.title}>Change Role</Text>

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
                    <Text style={styles.roleLabel}>{UserRoleLabels[role]}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={roleColor} />}
                  </View>
                  <Text style={styles.roleDescription}>{UserRoleDescriptions[role]}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
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
