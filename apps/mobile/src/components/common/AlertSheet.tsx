import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  spacing,
  fontSize,
  lineHeight,
  borderRadius,
  fontFamily as fonts,
} from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
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
  /** 'stacked' (default) or 'row' for side-by-side buttons. */
  buttonLayout?: 'stacked' | 'row';
  /** Override the title-row icon (instead of the default for the alert type). */
  iconOverride?: keyof typeof Ionicons.glyphMap;
  /** Override the title-row icon color (instead of the default for the alert type). */
  iconColorOverride?: string;
  /** Style the dismiss/cancel button as destructive (red border + tinted background). */
  destructiveCancel?: boolean;
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
  buttonLayout = 'stacked',
  iconOverride,
  iconColorOverride,
  destructiveCancel = false,
}: AlertSheetProps) {
  const config = alertConfig[type];
  const sheetBottomPadding = useSheetBottomPadding();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={[styles.content, { paddingBottom: sheetBottomPadding }]}>
        <View style={styles.titleRow}>
          {iconOverride ? (
            <Ionicons name={iconOverride} size={28} color={iconColorOverride ?? config.color} />
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
              <Ionicons name={config.icon} size={20} color="#fff" />
            </View>
          )}
          <AppText style={styles.title}>{title}</AppText>
        </View>
        <AppText style={styles.message}>{message}</AppText>

        {buttonLayout === 'row' && actionLabel && onAction ? (
          <View style={styles.buttonRow}>
            <Button
              onPress={onDismiss}
              variant="secondary"
              flex
              {...(destructiveCancel && {
                textColor: colors.error,
                style: styles.destructiveCancel,
              })}
              accessibilityLabel={buttonLabel}
            >
              {buttonLabel}
            </Button>
            <Button
              onPress={onAction}
              color={colors.electricBlue}
              flex
              accessibilityLabel={actionLabel}
            >
              {actionLabel}
            </Button>
          </View>
        ) : (
          <>
            <Button
              onPress={onDismiss}
              style={styles.fullWidth}
              color={colors.electricBlue}
              accessibilityLabel={buttonLabel}
            >
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
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  fullWidth: {
    alignSelf: 'stretch',
  },
  actionButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  destructiveCancel: {
    borderColor: colors.error,
    backgroundColor: colors.error + '1A',
  },
});
