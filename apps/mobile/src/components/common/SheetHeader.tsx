import React from 'react';
import { View, TouchableOpacity, StyleSheet, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from './AppText';

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
    <View style={[styles.headerContainer, { backgroundColor }]}>
      <View style={styles.header}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  header: {
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.lg,
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
});
