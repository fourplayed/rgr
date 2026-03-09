import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { UserRoleLabels } from '@rgr/shared';
import type { UserRole, Profile } from '@rgr/shared';
import { useUserList } from '../../src/hooks/useAdminUsers';
import { UserListItem, USER_ITEM_HEIGHT } from '../../src/components/admin/UserListItem';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';

const ROLES: UserRole[] = ['driver', 'mechanic', 'manager', 'superuser'];

export default function UsersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [showInactive, setShowInactive] = useState<boolean | undefined>(undefined);

  // Debounce search
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

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
    ({ item }: { item: Profile }) => (
      <UserListItem user={item} onPress={handleUserPress} />
    ),
    [handleUserPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyText}>No users found</Text>
        <Text style={styles.emptySubtext}>Try adjusting filters</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
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
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
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
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.textInverse : colors.text,
                      fontFamily: isSelected ? fonts.bold : fonts.regular,
                    },
                  ]}
                >
                  {UserRoleLabels[role]}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor:
                  showInactive === false ? colors.success : colors.surface,
                borderColor:
                  showInactive === false ? 'transparent' : colors.border,
              },
            ]}
            onPress={() =>
              setShowInactive((prev) =>
                prev === false ? undefined : false
              )
            }
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    showInactive === false
                      ? colors.textInverse
                      : colors.text,
                  fontFamily:
                    showInactive === false
                      ? fonts.bold
                      : fonts.regular,
                },
              ]}
            >
              Active Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load users</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
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
              (data?.data?.length ?? 0) === 0
                ? styles.emptyListContent
                : styles.listContent
            }
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryButton: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  emptyListContent: {
    flex: 1,
  },
});
