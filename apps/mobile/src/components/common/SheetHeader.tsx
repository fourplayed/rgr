import React from 'react';
import { View, TouchableOpacity, StyleSheet, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from './AppText';

// Build a reverse lookup: hex value → gradient endpoint
const GRADIENT_LOOKUP: Record<string, string> = {};
for (const [key, startColor] of Object.entries({
  [colors.success]: colors.gradientEndpoints.success,
  [colors.defectYellow]: colors.gradientEndpoints.defectYellow,
  [colors.warning]: colors.gradientEndpoints.warning,
  [colors.electricBlue]: colors.gradientEndpoints.electricBlue,
  [colors.maintenanceStatus.scheduled]: colors.gradientEndpoints.scheduled,
  [colors.error]: colors.gradientEndpoints.error,
  [colors.primary]: colors.gradientEndpoints.primary,
})) {
  GRADIENT_LOOKUP[key] = startColor;
}

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}

interface SheetHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onClose: () => void;
  backgroundColor?: string;
  /** Explicit gradient end color. If omitted, auto-looked up from gradientEndpoints. */
  gradientEnd?: string;
  disabled?: boolean;
  titleNumberOfLines?: number;
  titleStyle?: TextStyle;
  /** Optional action icon rendered to the left of the close button. */
  headerAction?: HeaderAction | undefined;
  /** Override close button icon (e.g. 'arrow-back' for stacked screens). Default: 'close'. */
  closeIcon?: keyof typeof Ionicons.glyphMap;
  /** Optional content rendered below the header row, still within the colored background. */
  children?: React.ReactNode;
}

export function SheetHeader({
  icon,
  title,
  onClose,
  backgroundColor = colors.electricBlue,
  gradientEnd: gradientEndProp,
  disabled = false,
  titleNumberOfLines = 1,
  titleStyle,
  headerAction,
  closeIcon = 'close',
  children,
}: SheetHeaderProps) {
  const endColor = gradientEndProp ?? GRADIENT_LOOKUP[backgroundColor] ?? backgroundColor;

  return (
    <View>
      <LinearGradient
        colors={[backgroundColor, endColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { shadowColor: backgroundColor }]}
      >
        <View style={styles.headerRow}>
          <Ionicons name={icon} size={26} color={colors.textInverse} />
          <AppText style={[styles.title, titleStyle]} numberOfLines={titleNumberOfLines}>
            {title}
          </AppText>
          {headerAction && (
            <TouchableOpacity
              onPress={headerAction.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={headerAction.accessibilityLabel}
              style={styles.actionButton}
            >
              <Ionicons name={headerAction.icon} size={22} color={colors.textInverse} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onClose}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeButton}
          >
            <View style={styles.closeCircle}>
              <Ionicons name={closeIcon} size={24} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
        </View>
        {children}
      </LinearGradient>
      {/* Gradient shadow separator below header */}
      <LinearGradient
        colors={[`${backgroundColor}1F`, 'transparent']}
        style={styles.headerShadow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerShadow: {
    height: 3,
  },
});
