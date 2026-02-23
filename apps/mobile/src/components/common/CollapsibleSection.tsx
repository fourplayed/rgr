import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
  /** Use 'flat' for no container styling (title on background) */
  variant?: 'contained' | 'flat';
}

export function CollapsibleSection({ title, children, defaultExpanded = true, badge, variant = 'contained' }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const isFlat = variant === 'flat';

  return (
    <View style={isFlat ? styles.containerFlat : styles.container}>
      <View style={isFlat ? styles.headerFlat : styles.header}>
        <View style={styles.titleRow}>
          <Text style={isFlat ? styles.titleFlat : styles.title}>{title}</Text>
          {badge}
        </View>
        <TouchableOpacity style={styles.chevronButton} onPress={toggle} activeOpacity={0.7}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
      {expanded && <View style={isFlat ? styles.contentFlat : styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  containerFlat: {
    // No background or border - sits on page background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  headerFlat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  titleFlat: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chevronButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  contentFlat: {
    marginTop: spacing.sm,
  },
});
