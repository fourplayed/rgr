import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { UserRoleLabels } from '@rgr/shared';
import type { UserRole, Profile } from '@rgr/shared';
import { useUserList } from '../../src/hooks/useAdminUsers';
import { UserListItem, USER_ITEM_HEIGHT } from '../../src/components/admin/UserListItem';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { AppSearchInput } from '../../src/components/common/AppSearchInput';
import { useDebounce } from '../../src/hooks/useDebounce';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';
import { adminStyles } from '../../src/theme/adminStyles';
import { AppText } from '../../src/components/common';

const ROLES: UserRole[] = ['driver', 'mechanic', 'manager', 'superuser'];

export default function UsersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [showInactive, setShowInactive] = useState<boolean | undefined>(undefined);

  const filters = useMemo(
    () => ({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(selectedRoles.length > 0 && { roles: selectedRoles }),
      ...(showInactive !== undefined && { isActive: showInactive }),
    }),
    [debouncedSearch, selectedRoles, showInactive]
  );

  const { data, isLoading, error, refetch } = useUserList(filters);

  const toggleRole = useCallback((role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }, []);

  const handleUserPress = useCallback(
    (user: Profile) => {
      router.push({ pathname: '/(admin)/user-detail', params: { userId: user.id } });
    },
    [router]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: USER_ITEM_HEIGHT + spacing.sm,
      offset: (USER_ITEM_HEIGHT + spacing.sm) * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Profile) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Profile }) => <UserListItem user={item} onPress={handleUserPress} />,
    [handleUserPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={adminStyles.centerContent}>
        <View style={adminStyles.iconContainer}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
        </View>
        <AppText style={adminStyles.emptyText}>No users found</AppText>
        <AppText style={adminStyles.emptySubtext}>Try adjusting filters</AppText>
      </View>
    ),
    []
  );

  return (
    <View style={adminStyles.container}>
      <SheetHeader
        icon="people"
        title="Users"
        onClose={() => router.back()}
        closeIcon="arrow-back"
        headerAction={{
          icon: 'add-circle',
          onPress: () => router.push('/(admin)/create-user'),
          accessibilityLabel: 'Add user',
        }}
      />

      {/* Search */}
      <View style={adminStyles.searchContainer}>
        <View style={adminStyles.searchBox}>
          <AppSearchInput
            icon="search"
            placeholder="Search by name or email..."
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        {ROLES.map((role) => {
          const isSelected = selectedRoles.includes(role);
          const roleColor =
            colors.userRole[role as keyof typeof colors.userRole] || colors.backgroundDark;
          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? roleColor : colors.surface,
                  borderColor: isSelected ? 'transparent' : colors.border,
                },
              ]}
              onPress={() => toggleRole(role)}
              activeOpacity={0.7}
            >
              <AppText
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? colors.textInverse : colors.text,
                    fontFamily: isSelected ? fonts.bold : fonts.regular,
                  },
                ]}
              >
                {UserRoleLabels[role]}
              </AppText>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: showInactive === false ? colors.electricBlue : colors.surface,
              borderColor: showInactive === false ? 'transparent' : colors.border,
            },
          ]}
          onPress={() => setShowInactive((prev) => (prev === false ? undefined : false))}
          activeOpacity={0.7}
        >
          <AppText
            style={[
              styles.chipText,
              {
                color: showInactive === false ? colors.textInverse : colors.text,
                fontFamily: showInactive === false ? fonts.bold : fonts.regular,
              },
            ]}
          >
            Active Only
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={adminStyles.loadingContainer}>
          <LoadingDots color={colors.textSecondary} size={12} />
        </View>
      ) : error ? (
        <View style={adminStyles.centerContent}>
          <AppText style={adminStyles.errorText}>Failed to load users</AppText>
          <TouchableOpacity style={adminStyles.retryButton} onPress={() => refetch()}>
            <AppText style={adminStyles.retryButtonText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ListEmptyComponent={renderEmpty}
          removeClippedSubviews
          contentContainerStyle={
            (data?.data?.length ?? 0) === 0 ? adminStyles.emptyListContent : styles.listContent
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
});
