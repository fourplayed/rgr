import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface PillBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  /** Icon size override (default 12) */
  iconSize?: number;
  /** Optional outer style (e.g. margin) — badge layout is the parent's concern */
  style?: StyleProp<ViewStyle>;
  /** Optional accessibility label (defaults to display label) */
  accessibilityLabel?: string;
  /** Optional accessibility role (e.g. "text" for informational badges) */
  accessibilityRole?: 'text' | 'button' | 'none';
}

export function PillBadge({ icon, label, color, iconSize = 12, style, accessibilityLabel, accessibilityRole }: PillBadgeProps) {
  return (
    <View
      style={[styles.badge, { backgroundColor: color }, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={accessibilityRole}
    >
      <Ionicons name={icon} size={iconSize} color={colors.textInverse} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  label: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
