import React, { useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LoadingDots } from './LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from './AppText';

// Reverse lookup: hex color → gradient endpoint
const GRADIENT_LOOKUP: Record<string, string> = {
  [colors.success]: colors.gradientEndpoints.success,
  [colors.defectYellow]: colors.gradientEndpoints.defectYellow,
  [colors.warning]: colors.gradientEndpoints.warning,
  [colors.electricBlue]: colors.gradientEndpoints.electricBlue,
  [colors.error]: colors.gradientEndpoints.error,
  [colors.primary]: colors.gradientEndpoints.primary,
};

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
  const isDisabled = disabled || isLoading;

  // Gradient: only for primary/danger variants with a color prop that has a known endpoint
  const gradientEnd = color ? GRADIENT_LOOKUP[color] : undefined;
  const useGradient =
    !!gradientEnd && !isDisabled && (variant === 'primary' || variant === 'danger');

  const bgOverride = !useGradient && color ? { backgroundColor: color } : undefined;
  const textColorOverride = textColor ? { color: textColor } : undefined;

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
  const contentEl = isLoading ? (
    <LoadingDots color={resolvedColor} size={8} />
  ) : icon ? (
    <View style={styles.iconRow}>
      <Ionicons name={icon} size={18} color={resolvedColor} />
      <AppText style={[textStyle, textColorOverride, disabledTextOverride]}>{children}</AppText>
    </View>
  ) : (
    <AppText style={[textStyle, textColorOverride, disabledTextOverride]}>{children}</AppText>
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
      {useGradient ? (
        <Animated.View style={[flex && styles.flex, style, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={[color!, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[
              styles.base,
              variantStyle,
              { backgroundColor: undefined },
              flex && styles.flex,
              isDisabled && styles.disabled,
            ]}
          >
            {contentEl}
          </LinearGradient>
        </Animated.View>
      ) : (
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
          {contentEl}
        </Animated.View>
      )}
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
    overflow: 'hidden',
  },
  flex: {
    flexGrow: 1,
    flexShrink: 1,
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
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.error,
  },
});

const textStyles = StyleSheet.create({
  primary: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  secondary: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  danger: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
