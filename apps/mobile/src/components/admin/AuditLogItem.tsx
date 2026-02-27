import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AuditLogWithUser } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  INSERT: 'add-circle-outline',
  UPDATE: 'create-outline',
  DELETE: 'trash-outline',
  LOGIN: 'log-in-outline',
  LOGOUT: 'log-out-outline',
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: colors.success,
  UPDATE: colors.electricBlue,
  DELETE: colors.error,
  LOGIN: colors.info,
  LOGOUT: colors.textSecondary,
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
  });
}

interface AuditLogItemProps {
  item: AuditLogWithUser;
}

function AuditLogItemInner({ item }: AuditLogItemProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => setExpanded((prev) => !prev), []);

  const actionKey = item.action.toUpperCase();
  const icon = ACTION_ICONS[actionKey] || 'ellipse-outline';
  const iconColor = ACTION_COLORS[actionKey] || colors.textSecondary;

  const description = item.tableName
    ? `${item.action} on ${item.tableName}`
    : item.action;

  const hasDetails =
    (item.oldValues && Object.keys(item.oldValues).length > 0) ||
    (item.newValues && Object.keys(item.newValues).length > 0);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={hasDetails ? toggleExpand : undefined}
      activeOpacity={hasDetails ? 0.7 : 1}
      disabled={!hasDetails}
      accessibilityRole={hasDetails ? 'button' : 'text'}
      accessibilityLabel={`${description} by ${item.userName || 'System'}, ${formatRelativeTime(item.createdAt)}`}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.content}>
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.userName}>{item.userName || 'System'}</Text>
            <Text style={styles.timestamp}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
        </View>
        {hasDetails && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        )}
      </View>

      {expanded && hasDetails && (
        <View style={styles.details}>
          {item.oldValues && Object.keys(item.oldValues).length > 0 && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Old Values</Text>
              <View style={styles.jsonBox}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(item.oldValues, null, 2)}
                </Text>
              </View>
            </View>
          )}
          {item.newValues && Object.keys(item.newValues).length > 0 && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>New Values</Text>
              <View style={styles.jsonBox}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(item.newValues, null, 2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const AuditLogItem = memo(AuditLogItemInner, (prev, next) => {
  return prev.item.id === next.item.id;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  userName: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  timestamp: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailBlock: {
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jsonBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  jsonText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
