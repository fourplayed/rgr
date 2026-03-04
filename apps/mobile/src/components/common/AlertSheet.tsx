import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize } from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

interface AlertSheetProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onDismiss: () => void;
  buttonLabel?: string;
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
}: AlertSheetProps) {
  const config = alertConfig[type];

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
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

        <Button
          onPress={onDismiss}
          style={styles.fullWidth}
          accessibilityLabel={buttonLabel}
        >
          {buttonLabel}
        </Button>
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
  fullWidth: {
    alignSelf: 'stretch',
  },
});
