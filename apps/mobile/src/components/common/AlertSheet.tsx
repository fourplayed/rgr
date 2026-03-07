import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, lineHeight, fontFamily as fonts } from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { IconCircle } from './IconCircle';

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

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <IconCircle icon={config.icon} color={config.color} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <Button
          onPress={onDismiss}
          style={styles.fullWidth}
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
  fullWidth: {
    alignSelf: 'stretch',
  },
  actionButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
