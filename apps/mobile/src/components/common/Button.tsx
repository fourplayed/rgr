import React, { useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  Animated,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LoadingDots } from './LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  /** Override background color (e.g. for dynamic confirm buttons) */
  color?: string;
  /** Override label color */
  textColor?: string;
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
  textColor,
  disabled = false,
  isLoading = false,
  icon,
  flex = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const variantStyle = variantStyles[variant];
  const textStyle = textStyles[variant];
  const bgOverride = color ? { backgroundColor: color } : undefined;
  const textColorOverride = textColor ? { color: textColor } : undefined;
  const isDisabled = disabled || isLoading;

  const disabledTextOverride =
    isDisabled && !isLoading ? { color: colors.textDisabled } : undefined;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const resolvedColor = isDisabled ? colors.textDisabled : (textColor ?? textStyle.color);
  const content = isLoading ? (
    <LoadingDots color={resolvedColor} size={8} />
  ) : icon ? (
    <View style={styles.iconRow}>
      <Ionicons name={icon} size={18} color={resolvedColor} />
      <Text style={[textStyle, textColorOverride, disabledTextOverride]}>{children}</Text>
    </View>
  ) : (
    <Text style={[textStyle, textColorOverride, disabledTextOverride]}>{children}</Text>
  );

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={flex ? styles.flex : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
    >
      <Animated.View
        style={[
          styles.base,
          variantStyle,
          bgOverride,
          flex && styles.flex,
          isDisabled && styles.disabled,
          style,
          { transform: [{ scale }] },
        ]}
      >
        {content}
      </Animated.View>
    </Pressable>
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
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  secondary: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  danger: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
