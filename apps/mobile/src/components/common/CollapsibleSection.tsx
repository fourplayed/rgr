import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import '../../utils/enableLayoutAnimation';

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
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    const anim = Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [expanded, rotateAnim]);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  const isFlat = variant === 'flat';

  return (
    <View style={isFlat ? styles.containerFlat : styles.container}>
      <View style={isFlat ? styles.headerFlat : styles.header}>
        <View style={styles.titleRow}>
          <Text style={isFlat ? styles.titleFlat : styles.title}>{title}</Text>
          {badge}
        </View>
        <TouchableOpacity
          style={styles.chevronButton}
          onPress={toggle}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${title} section`}
          accessibilityState={{ expanded }}
        >
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.text}
            />
          </Animated.View>
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
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chevronButton: {
    backgroundColor: colors.background,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  contentFlat: {
    marginTop: spacing.sm,
  },
});
