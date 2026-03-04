import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize } from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export type ConfirmType = 'danger' | 'warning';

interface ConfirmSheetProps {
  visible: boolean;
  type: ConfirmType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const confirmConfig: Record<ConfirmType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  danger: { icon: 'alert-circle', color: colors.error },
  warning: { icon: 'warning', color: colors.warning },
};

export function ConfirmSheet({
  visible,
  type,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmSheetProps) {
  const config = confirmConfig[type];

  return (
    <BottomSheet visible={visible} onDismiss={onCancel}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Ionicons
            name={config.icon}
            size={48}
            color={config.color}
          />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            onPress={onCancel}
            disabled={isLoading}
            flex
            accessibilityLabel={cancelLabel}
          >
            {cancelLabel}
          </Button>

          <Button
            onPress={onConfirm}
            disabled={isLoading}
            color={config.color}
            flex
            accessibilityLabel={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
});
