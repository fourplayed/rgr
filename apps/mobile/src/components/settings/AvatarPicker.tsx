import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';
import { useAvatarStore, AVATAR_OPTIONS } from '../../store/avatarStore';

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Semi-transparent backdrop matching app's overlay */}
        <View style={styles.backdropTint} />

        <Pressable style={styles.containerWrapper} onPress={e => e.stopPropagation()}>
          <View style={styles.container}>
            {/* Handle bar */}
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Choose Avatar</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {AVATAR_OPTIONS.map(avatar => {
                const isSelected = selectedAvatarId === avatar.id;
                return (
                  <TouchableOpacity
                    key={avatar.id}
                    style={[
                      styles.avatarOption,
                      isSelected && styles.avatarOptionSelected,
                    ]}
                    onPress={() => handleSelectAvatar(avatar.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${avatar.label} avatar`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.avatarCircle,
                        isSelected && styles.avatarCircleSelected,
                      ]}
                    >
                      <Ionicons
                        name={avatar.icon}
                        size={28}
                        color={isSelected ? colors.textInverse : colors.backgroundDark}
                      />
                    </View>
                    <Text
                      style={[
                        styles.avatarLabel,
                        isSelected && styles.avatarLabelSelected,
                      ]}
                    >
                      {avatar.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  containerWrapper: {
    width: '100%',
    maxWidth: 360,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 10,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 2,
    borderColor: colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: colors.backgroundDark,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
  },
});
