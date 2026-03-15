import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';
import { LoadingDots } from '../common/LoadingDots';

interface FleetInsightCardProps {
  content: string | null;
  isLoading: boolean;
  createdAt?: string | null;
}

const SECTION_TAG_RE = /\[(FLEET|SCANS|MAINTENANCE|COMPLIANCE)\]([\s\S]*?)\[\/\1\]/g;

/** Extract tagged sections from AI output; falls back to raw content for untagged strings. */
function parseSections(raw: string): string[] {
  const sections: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = SECTION_TAG_RE.exec(raw)) !== null) {
    const text = match[2]?.trim();
    if (text) sections.push(text);
  }
  SECTION_TAG_RE.lastIndex = 0;
  return sections.length > 0 ? sections : [raw];
}

const READ_MORE_THRESHOLD = 120;

export function FleetInsightCard({ content, isLoading, createdAt }: FleetInsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);
  const sections = useMemo(() => (content ? parseSections(content) : []), [content]);
  const visibleText = useMemo(() => sections.join(' '), [sections]);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles-outline" size={20} color={colors.electricBlue} />
            <AppText style={styles.label}>Fleet Insight</AppText>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingDots color={colors.textSecondary} size={6} />
        </View>
        <View style={styles.separator} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles-outline" size={20} color={colors.electricBlue} />
          <AppText style={styles.label}>Fleet Insight</AppText>
        </View>
        {createdAt && <AppText style={styles.timestamp}>{formatRelativeTime(createdAt)}</AppText>}
      </View>
      {content ? (
        <>
          {expanded ? (
            sections.map((section, i) => (
              <AppText key={i} style={[styles.body, i > 0 && styles.sectionGap]}>
                {section}
              </AppText>
            ))
          ) : (
            <AppText style={styles.body} numberOfLines={3}>
              {visibleText}
            </AppText>
          )}
          {visibleText.length > READ_MORE_THRESHOLD && (
            <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
              <AppText style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</AppText>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <AppText style={styles.emptyText}>No fleet analysis available yet</AppText>
      )}
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timestamp: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.electricBlue,
  },
  body: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 20,
  },
  sectionGap: {
    marginTop: spacing.sm,
  },
  readMore: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textDisabled,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
