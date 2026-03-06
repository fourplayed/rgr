import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Profile } from '@rgr/shared';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { getUserRoleColor } from '../../utils/getUserRoleColor';

export const USER_ITEM_HEIGHT = 88;

interface UserListItemProps {
  user: Profile;
  onPress: (user: Profile) => void;
}

function UserListItemInner({ user, onPress }: UserListItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderLeftColor: getUserRoleColor(user.role) ?? colors.border,
        },
      ]}
      onPress={() => onPress(user)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${user.fullName}, ${UserRoleLabels[user.role]}, ${user.isActive ? 'active' : 'inactive'}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {user.fullName}
        </Text>
        <View style={styles.badges}>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: getUserRoleColor(user.role) ?? colors.backgroundDark,
              },
            ]}
          >
            <Text style={styles.roleBadgeText}>
              {UserRoleLabels[user.role]}
            </Text>
          </View>
          <Text
            style={[
              styles.statusText,
              { color: user.isActive ? colors.success : colors.textSecondary },
            ]}
          >
            {user.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
        {user.depot && (
          <Text style={styles.depot} numberOfLines={1}>
            {user.depot}
          </Text>
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
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginRight: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  depot: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
