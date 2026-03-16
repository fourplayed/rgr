import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, lineHeight, fontFamily as fonts } from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetHeader } from './SheetHeader';
import { AppText } from './AppText';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

interface AlertSheetProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onDismiss: () => void;
  buttonLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const alertConfig: Record<AlertType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  error: { icon: 'close-circle', color: colors.error },
  warning: { icon: 'warning', color: colors.warning },
  info: { icon: 'information-circle', color: colors.info },
  success: { icon: 'checkmark-circle', color: colors.success },
};

export function AlertSheet({
  visible,
  type,
  title,
  message,
  onDismiss,
  buttonLabel = 'OK',
  actionLabel,
  onAction,
}: AlertSheetProps) {
  const config = alertConfig[type];
  const sheetBottomPadding = useSheetBottomPadding();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <SheetHeader
        icon={config.icon}
        title={title}
        onClose={onDismiss}
        backgroundColor={config.color}
      />
      <View style={[styles.content, { paddingBottom: sheetBottomPadding }]}>
        <AppText style={styles.message}>{message}</AppText>

        <Button onPress={onDismiss} style={styles.fullWidth} accessibilityLabel={buttonLabel}>
          {buttonLabel}
        </Button>
        {actionLabel && onAction && (
          <Button
            onPress={onAction}
            variant="secondary"
            style={styles.actionButton}
            accessibilityLabel={actionLabel}
          >
            {actionLabel}
          </Button>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: lineHeight.body,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  actionButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
