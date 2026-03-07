import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, fontSize, spacing, fontFamily as fonts } from '../../theme/spacing';

const PADDING = spacing.xs; // 4 — breathing room between tray edge and pill

interface SegmentedTabsProps<T extends string> {
  tabs: readonly { key: T; label: string }[];
  activeTab: T;
  onTabPress: (key: T) => void;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeTab,
  onTabPress,
}: SegmentedTabsProps<T>) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [trayWidth, setTrayWidth] = useState(0);

  const pillWidth = trayWidth > 0 && tabs.length > 0 ? (trayWidth - 2 * PADDING) / tabs.length : 0;
  const activeIndex = tabs.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    if (pillWidth === 0) return;
    const anim = Animated.spring(translateX, {
      toValue: activeIndex * pillWidth,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [activeIndex, pillWidth, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrayWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.tray} onLayout={handleLayout} accessibilityRole="tablist">
      {/* Sliding pill indicator */}
      {pillWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              transform: [{ translateX }],
            },
          ]}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      )}

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const selected = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${tab.label} tab`}
          >
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: PADDING,
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.base,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
});
