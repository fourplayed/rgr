import React from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
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
  flex = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const textStyle = textStyles[variant];
  const bgOverride = color ? { backgroundColor: color } : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle,
        bgOverride,
        flex && styles.flex,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
    >
      <Text style={textStyle}>{children}</Text>
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
    opacity: 0.5,
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
