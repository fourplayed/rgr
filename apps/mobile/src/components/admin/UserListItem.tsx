import React, { memo, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { Profile } from '@rgr/shared';
import { UserRoleLabels } from '@rgr/shared';
import { Badge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { getUserRoleColor } from '../../utils/getUserRoleColor';
import { AppText } from '../common';

export const USER_ITEM_HEIGHT = 88;

interface UserListItemProps {
  user: Profile;
  onPress: (user: Profile) => void;
}

function UserListItemInner({ user, onPress }: UserListItemProps) {
  const handlePress = useCallback(() => {
    onPress(user);
  }, [onPress, user]);
  const borderColor = getUserRoleColor(user.role) ?? colors.border;
  const containerStyle = useMemo(
    () => [
      styles.container,
      { borderColor, borderWidth: 0.5, backgroundColor: borderColor + '08' },
    ],
    [borderColor]
  );

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${user.fullName}, ${UserRoleLabels[user.role]}, ${user.isActive ? 'active' : 'inactive'}`}
    >
      <View style={styles.headerRow}>
        <AppText style={styles.name} numberOfLines={1}>
          {user.fullName}
        </AppText>
        <View style={styles.badges}>
          <Badge
            label={UserRoleLabels[user.role]}
            color={getUserRoleColor(user.role) ?? colors.backgroundDark}
            size="small"
          />
          <AppText
            style={[
              styles.statusText,
              { color: user.isActive ? colors.success : colors.textSecondary },
            ]}
          >
            {user.isActive ? 'Active' : 'Inactive'}
          </AppText>
        </View>
      </View>
      <View style={styles.footerRow}>
        <AppText style={styles.email} numberOfLines={1}>
          {user.email}
        </AppText>
        {user.depot && (
          <AppText style={styles.depot} numberOfLines={1}>
            {user.depot}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const UserListItem = memo(UserListItemInner, (prev, next) => {
  return (
    prev.user.id === next.user.id &&
    prev.user.role === next.user.role &&
    prev.user.isActive === next.user.isActive &&
    prev.user.fullName === next.user.fullName &&
    prev.user.email === next.user.email &&
    prev.user.depot === next.user.depot &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  container: {
    height: USER_ITEM_HEIGHT,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  email: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  depot: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
