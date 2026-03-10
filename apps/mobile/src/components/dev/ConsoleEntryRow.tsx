import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ConsoleEntry, ConsoleLevel } from '../../store/consoleStore';
import { fontSize, fontFamily as fonts } from '../../theme/spacing';

const LEVEL_COLORS: Record<ConsoleLevel, string> = {
  info: '#00A8FF',
  warn: '#F59E0B',
  error: '#EF4444',
  debug: '#94A3B8',
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export const ROW_HEIGHT = 52;

interface Props {
  entry: ConsoleEntry;
}

function ConsoleEntryRowInner({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = LEVEL_COLORS[entry.level];
  const hasData = entry.data !== undefined;

  return (
    <Pressable onPress={hasData ? () => setExpanded((v) => !v) : undefined} style={styles.row}>
      {/* Level color stripe */}
      <View style={[styles.stripe, { backgroundColor: color }]} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          {/* Namespace pill */}
          <View style={styles.namespacePill}>
            <Text style={styles.namespaceText}>{entry.namespace.toUpperCase()}</Text>
          </View>

          {/* Timestamp */}
          <Text style={styles.timestamp}>{formatTime(entry.timestamp)}</Text>
        </View>

        {/* Message */}
        <Text style={[styles.message, { color }]} numberOfLines={expanded ? undefined : 2}>
          {entry.message}
        </Text>

        {/* Expanded data payload */}
        {expanded && hasData && (
          <Text style={styles.dataText} selectable>
            {JSON.stringify(entry.data, null, 2)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export const ConsoleEntryRow = React.memo(ConsoleEntryRowInner, (prev, next) => {
  return prev.entry.id === next.entry.id;
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stripe: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  namespacePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginRight: 6,
  },
  namespaceText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: fontSize.micro,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: fontSize.xxs,
    fontFamily: fonts.regular,
  },
  message: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    lineHeight: 16, // compact console row
  },
  dataText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: fontSize.xxs,
    fontFamily: fonts.regular,
    marginTop: 4,
    lineHeight: 14, // compact console data
  },
});
