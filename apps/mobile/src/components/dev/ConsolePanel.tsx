import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConsoleStore } from '../../store/consoleStore';
import type { ConsoleEntry, ConsoleNamespace } from '../../store/consoleStore';
import { ConsoleEntryRow, ROW_HEIGHT } from './ConsoleEntryRow';
import { SHEET_SPRING } from '../../theme/animation';
import { fontSize, fontFamily as fonts } from '../../theme/spacing';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

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

  const panelWidth = SCREEN_WIDTH;
  const panelHeight = Math.round(SCREEN_HEIGHT * 0.5);

  const translateX = useRef(new Animated.Value(-panelWidth)).current;
  const flatListRef = useRef<FlatList<ConsoleEntry>>(null);
  const userScrolledUp = useRef(false);

  // Slide in/out from left
  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isOpen ? 0 : -panelWidth,
      friction: SHEET_SPRING.friction,
      tension: SHEET_SPRING.tension,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX, panelWidth]);

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
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      userScrolledUp.current = distanceFromBottom > ROW_HEIGHT * 2;
    },
    [],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConsoleEntry }) => <ConsoleEntryRow entry={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ConsoleEntry) => String(item.id), []);

  return (
    <Animated.View
      pointerEvents={isOpen ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {
          top: insets.top,
          height: panelHeight,
          transform: [{ translateX }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CONSOLE</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={growPanel} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable onPress={shrinkPanel} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable onPress={clearEntries} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable onPress={toggleOpen} hitSlop={8} style={styles.headerBtn}>
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
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 30, 0.85)',
    zIndex: 1000,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  title: {
    color: '#D4FF00',
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    padding: 4,
  },
  filterRow: {
    maxHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: '#D4FF00',
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: fontSize.xxs,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#000030',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
});
