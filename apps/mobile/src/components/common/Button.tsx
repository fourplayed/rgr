import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from './LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  /** Override background color (e.g. for dynamic confirm buttons) */
  color?: string;
  disabled?: boolean;
  /** Show loading dots instead of children */
  isLoading?: boolean;
  /** Render an icon left of the label */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Fill available width when used in a flex row */
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  color,
  disabled = false,
  isLoading = false,
  icon,
  flex = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const textStyle = textStyles[variant];
  const bgOverride = color ? { backgroundColor: color } : undefined;
  const isDisabled = disabled || isLoading;

  const disabledTextOverride = isDisabled && !isLoading ? { color: '#94A3B8' } : undefined;

  const content = isLoading ? (
    <LoadingDots color={textStyle.color} size={8} />
  ) : icon ? (
    <View style={styles.iconRow}>
      <Ionicons name={icon} size={18} color={isDisabled ? '#94A3B8' : textStyle.color} />
      <Text style={[textStyle, disabledTextOverride]}>{children}</Text>
    </View>
  ) : (
    <Text style={[textStyle, disabledTextOverride]}>{children}</Text>
  );

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle,
        bgOverride,
        flex && styles.flex,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  disabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.error,
    ...shadows.md,
  },
});

const textStyles = StyleSheet.create({
  primary: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  secondary: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  danger: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
