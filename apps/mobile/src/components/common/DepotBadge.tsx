import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from './AppText';

interface DepotBadgeProps {
  label: string;
  bgColor: string;
  textColor: string;
  /** Show location icon — defaults to false */
  showIcon?: boolean;
}

export function DepotBadge({ label, bgColor, textColor, showIcon = false }: DepotBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      {showIcon && <Ionicons name="location" size={12} color={textColor} />}
      <AppText style={[styles.text, { color: textColor }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  text: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
});
