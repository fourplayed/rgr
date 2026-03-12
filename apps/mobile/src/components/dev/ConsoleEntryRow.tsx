import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type { ConsoleEntry, ConsoleLevel } from '../../store/consoleStore';
import { colors } from '../../theme/colors';
import { borderRadius, fontSize, fontFamily as fonts, spacing } from '../../theme/spacing';
import { AppText } from '../common';

const LEVEL_COLORS: Record<ConsoleLevel, string> = {
  info: colors.electricBlue,
  warn: colors.warning,
  error: colors.error,
  debug: colors.textDisabled,
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
            <AppText style={styles.namespaceText}>{entry.namespace.toUpperCase()}</AppText>
          </View>

          {/* Timestamp */}
          <AppText style={styles.timestamp}>{formatTime(entry.timestamp)}</AppText>
        </View>

        {/* Message */}
        <AppText style={[styles.message, { color }]} numberOfLines={expanded ? undefined : 2}>
          {entry.message}
        </AppText>

        {/* Expanded data payload */}
        {expanded && hasData && (
          <AppText style={styles.dataText} selectable>
            {JSON.stringify(entry.data, null, 2)}
          </AppText>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  stripe: {
    width: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  namespacePill: {
    backgroundColor: 'rgba(0, 168, 255, 0.15)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs + 1,
    paddingVertical: 1,
    marginRight: spacing.sm - 2,
  },
  namespaceText: {
    color: 'rgba(0, 168, 255, 0.80)',
    fontSize: fontSize.micro,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: fontSize.xxs,
    fontFamily: fonts.regular,
  },
  message: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    lineHeight: 16,
  },
  dataText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: fontSize.xxs,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
    lineHeight: 14,
  },
});
