import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { useAvatarStore, AVATAR_OPTIONS } from '../../store/avatarStore';
import { BottomSheet } from '../common/BottomSheet';
import { SheetHeader } from '../common/SheetHeader';
import { AppText } from '../common';

interface AvatarPickerProps {
  visible: boolean;
  onClose: () => void;
}

export function AvatarPicker({ visible, onClose }: AvatarPickerProps) {
  const { selectedAvatarId, setAvatar } = useAvatarStore();

  const handleSelectAvatar = async (avatarId: string) => {
    await setAvatar(avatarId);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onDismiss={onClose}>
      <View style={styles.content}>
        <SheetHeader icon="person-circle-outline" title="Choose Avatar" onClose={onClose} />

        <View style={styles.grid}>
          {AVATAR_OPTIONS.map((avatar) => {
            const isSelected = selectedAvatarId === avatar.id;
            return (
              <TouchableOpacity
                key={avatar.id}
                style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                onPress={() => handleSelectAvatar(avatar.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${avatar.label} avatar`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                  <Ionicons
                    name={avatar.icon}
                    size={28}
                    color={isSelected ? colors.textInverse : colors.backgroundDark}
                  />
                </View>
                <AppText style={[styles.avatarLabel, isSelected && styles.avatarLabelSelected]}>
                  {avatar.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  avatarOption: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  avatarOptionSelected: {
    backgroundColor: colors.surface,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarCircleSelected: {
    backgroundColor: colors.backgroundDark,
    borderColor: colors.backgroundDark,
  },
  avatarLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: colors.backgroundDark,
    fontFamily: fonts.bold,
  },
});
