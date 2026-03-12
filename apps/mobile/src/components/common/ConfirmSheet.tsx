import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, lineHeight, fontFamily as fonts } from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { IconCircle } from './IconCircle';
import { AppText } from './AppText';

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

const confirmConfig: Record<ConfirmType, { icon: keyof typeof Ionicons.glyphMap; color: string }> =
  {
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
        <View style={styles.iconWrapper}>
          <IconCircle icon={config.icon} color={config.color} />
        </View>

        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.message}>{message}</AppText>

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
            isLoading={isLoading}
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
  iconWrapper: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: lineHeight.body,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
});
