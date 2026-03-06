import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AuditLogWithUser } from '@rgr/shared';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

/** Runtime guard: true only for plain (non-array, non-null) objects. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Fields that may contain sensitive data — redact before display */
const REDACTED_FIELDS = new Set([
  'password', 'password_hash', 'encrypted_password',
  'access_token', 'refresh_token', 'token',
  'secret', 'api_key', 'ssn', 'tax_id',
]);

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        isPlainObject(item) ? redactSensitiveFields(item) : item
      );
    } else if (isPlainObject(value)) {
      result[key] = redactSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function safeStringify(val: unknown): string {
  try {
    return JSON.stringify(isPlainObject(val) ? redactSensitiveFields(val) : val, null, 2);
  } catch {
    return '[Unable to display]';
  }
}

const ACTION_ICONS: Partial<Record<AuditAction, keyof typeof Ionicons.glyphMap>> = {
  INSERT: 'add-circle-outline',
  UPDATE: 'create-outline',
  DELETE: 'trash-outline',
  LOGIN: 'log-in-outline',
  LOGOUT: 'log-out-outline',
};

const ACTION_COLORS: Partial<Record<AuditAction, string>> = {
  INSERT: colors.success,
  UPDATE: colors.electricBlue,
  DELETE: colors.error,
  LOGIN: colors.info,
  LOGOUT: colors.textSecondary,
};

interface AuditLogItemProps {
  item: AuditLogWithUser;
}

function AuditLogItemInner({ item }: AuditLogItemProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => setExpanded((prev) => !prev), []);

  const uppercased = item.action.toUpperCase();
  const actionKey = uppercased in ACTION_ICONS ? uppercased as keyof typeof ACTION_ICONS : null;
  const icon = (actionKey ? ACTION_ICONS[actionKey] : undefined) ?? 'document-outline';
  const iconColor = (actionKey ? ACTION_COLORS[actionKey] : undefined) ?? colors.textSecondary;

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
                  {safeStringify(item.oldValues)}
                </Text>
              </View>
            </View>
          )}
          {item.newValues && Object.keys(item.newValues).length > 0 && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>New Values</Text>
              <View style={styles.jsonBox}>
                <Text style={styles.jsonText}>
                  {safeStringify(item.newValues)}
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
  return (
    prev.item.id === next.item.id &&
    prev.item.action === next.item.action &&
    prev.item.tableName === next.item.tableName &&
    prev.item.userName === next.item.userName &&
    prev.item.createdAt === next.item.createdAt &&
    prev.item.oldValues === next.item.oldValues &&
    prev.item.newValues === next.item.newValues
  );
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
