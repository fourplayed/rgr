import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily } from '../../theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../theme/layout';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  compact?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, rightAction, compact = false }: ScreenHeaderProps) {
  return (
    <View style={[styles.container, { paddingBottom: compact ? spacing.sm : spacing.md }]}>
      <View style={[styles.row, { alignItems: subtitle ? 'flex-start' : 'center' }]}>
        <View style={styles.left}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: CONTENT_TOP_OFFSET,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.chrome, // Opaque fill prevents FlatList overscroll bleed-through
    zIndex: 1, // Render above sibling FlatList during iOS bounce
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
});
