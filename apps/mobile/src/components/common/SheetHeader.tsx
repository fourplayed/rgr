import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';

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
  disabled = false,
  titleNumberOfLines = 1,
  titleStyle,
  headerAction,
  closeIcon = 'close',
  children,
}: SheetHeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={30} color={colors.textInverse} />
        <Text style={[styles.title, titleStyle]} numberOfLines={titleNumberOfLines}>
          {title}
        </Text>
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
          <Ionicons name={closeIcon} size={26} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.sm,
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
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
});
