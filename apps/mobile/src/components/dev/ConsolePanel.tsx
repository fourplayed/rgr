import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConsoleStore } from '../../store/consoleStore';
import type { ConsoleEntry, ConsoleNamespace } from '../../store/consoleStore';
import { ConsoleEntryRow, ROW_HEIGHT } from './ConsoleEntryRow';
import { SHEET_SPRING } from '../../theme/animation';
import { colors } from '../../theme/colors';
import { borderRadius, fontSize, fontFamily as fonts, spacing } from '../../theme/spacing';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const FILTERS: (ConsoleNamespace | null)[] = [
  null,
  'scan',
  'network',
  'auth',
  'location',
  'query',
  'mutation',
  'system',
];

const FILTER_LABELS: Record<string, string> = {
  null: 'ALL',
  scan: 'SCAN',
  network: 'NETWORK',
  auth: 'AUTH',
  location: 'LOCATION',
  query: 'QUERY',
  mutation: 'MUTATION',
  system: 'SYSTEM',
};

export function ConsolePanel() {
  const insets = useSafeAreaInsets();
  const isOpen = useConsoleStore((s) => s.isOpen);
  const entries = useConsoleStore((s) => s.entries);
  const activeFilter = useConsoleStore((s) => s.activeFilter);
  const clearEntries = useConsoleStore((s) => s.clearEntries);
  const toggleOpen = useConsoleStore((s) => s.toggleOpen);
  const setFilter = useConsoleStore((s) => s.setFilter);
  const growPanel = useConsoleStore((s) => s.growPanel);
  const shrinkPanel = useConsoleStore((s) => s.shrinkPanel);
  const heightOffset = useConsoleStore((s) => s.heightOffset);

  const panelHeight = Math.round(SCREEN_HEIGHT * 0.45) + heightOffset;

  const translateY = useRef(new Animated.Value(panelHeight)).current;
  const flatListRef = useRef<FlatList<ConsoleEntry>>(null);
  const userScrolledUp = useRef(false);

  // Slide up/down from bottom
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOpen ? 0 : panelHeight,
      friction: SHEET_SPRING.friction,
      tension: SHEET_SPRING.tension,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateY, panelHeight]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!activeFilter) return entries;
    return entries.filter((e) => e.namespace === activeFilter);
  }, [entries, activeFilter]);

  // Auto-scroll to bottom when new entries arrive (unless user scrolled up)
  useEffect(() => {
    if (isOpen && !userScrolledUp.current && filteredEntries.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [filteredEntries.length, isOpen]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      userScrolledUp.current = distanceFromBottom > ROW_HEIGHT * 2;
    },
    []
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: ConsoleEntry }) => <ConsoleEntryRow entry={item} />,
    []
  );

  const keyExtractor = useCallback((item: ConsoleEntry) => String(item.id), []);

  const useBlur = Platform.OS === 'ios';

  return (
    <Animated.View
      pointerEvents={isOpen ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {
          height: panelHeight,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Background: BlurView on iOS, semi-transparent navy on Android */}
      {useBlur ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
      )}

      {/* Drag handle indicator */}
      <View style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CONSOLE</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={growPanel} hitSlop={spacing.sm} style={styles.headerBtn}>
            <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable onPress={shrinkPanel} hitSlop={spacing.sm} style={styles.headerBtn}>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable onPress={clearEntries} hitSlop={spacing.sm} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable onPress={toggleOpen} hitSlop={spacing.sm} style={styles.headerBtn}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => {
          const isActive = f === activeFilter;
          return (
            <Pressable
              key={String(f)}
              onPress={() => setFilter(f)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {FILTER_LABELS[String(f)]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Log entries */}
      <FlatList
        ref={flatListRef}
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={30}
        maxToRenderPerBatch={20}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  androidBg: {
    backgroundColor: 'rgba(0, 0, 30, 0.92)',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: colors.electricBlue,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerBtn: {
    padding: spacing.xs,
  },
  filterRow: {
    maxHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm - 2,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  chipActive: {
    backgroundColor: colors.electricBlue,
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.50)',
    fontSize: fontSize.xxs,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: colors.navy,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
});
