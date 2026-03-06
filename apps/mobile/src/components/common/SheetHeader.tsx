import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';

interface SheetHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onClose: () => void;
  backgroundColor?: string;
  disabled?: boolean;
  titleNumberOfLines?: number;
}

export function SheetHeader({
  icon,
  title,
  onClose,
  backgroundColor = colors.electricBlue,
  disabled = false,
  titleNumberOfLines = 1,
}: SheetHeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <Ionicons name={icon} size={30} color={colors.textInverse} />
      <Text style={styles.title} numberOfLines={titleNumberOfLines}>
        {title}
      </Text>
      <TouchableOpacity
        onPress={onClose}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={styles.closeButton}
      >
        <Ionicons name="close" size={26} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
