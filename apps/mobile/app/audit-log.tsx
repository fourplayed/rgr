import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { AuditLogWithUser } from '@rgr/shared';
import { useAuditLogs } from '../src/hooks/useAdminAuditLog';
import { AuditLogItem } from '../src/components/admin/AuditLogItem';
import {
  AuditLogFilterSheet,
  type AuditLogFilters,
} from '../src/components/admin/AuditLogFilterSheet';
import { LoadingDots } from '../src/components/common/LoadingDots';
import { useUserPermissions } from '../src/contexts/UserPermissionsContext';
import { colors } from '../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../src/theme/spacing';

export default function AuditLogScreen() {
  const router = useRouter();
  const { canViewAuditLog } = useUserPermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  // Redirect non-authorized users
  useEffect(() => {
    if (!canViewAuditLog) {
      router.replace('/(tabs)');
    }
  }, [canViewAuditLog, router]);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditLogs(filters);

  const allLogs = useMemo(
    () => data?.pages?.flatMap((page) => page.data) ?? [],
    [data]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApplyFilters = useCallback((newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  }, []);

  const keyExtractor = useCallback((item: AuditLogWithUser) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: AuditLogWithUser }) => <AuditLogItem item={item} />,
    []
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <LoadingDots color={colors.electricBlue} size={8} />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.emptyText}>No audit logs</Text>
        <Text style={styles.emptySubtext}>Activity will appear here</Text>
      </View>
    ),
    []
  );

  if (!canViewAuditLog) return null;

  const hasActiveFilters =
    !!filters.action || !!filters.startDate || !!filters.endDate;

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Audit Log</Text>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filterButton}
            accessibilityRole="button"
            accessibilityLabel="Filter audit logs"
          >
            <Ionicons
              name={hasActiveFilters ? 'funnel' : 'funnel-outline'}
              size={22}
              color={hasActiveFilters ? colors.electricBlue : colors.text}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.electricBlue} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load audit logs</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={allLogs}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            contentContainerStyle={
              allLogs.length === 0 ? styles.emptyListContent : styles.listContent
            }
          />
        )}

        <AuditLogFilterSheet
          visible={showFilters}
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: { padding: spacing.sm },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterButton: {
    padding: spacing.sm,
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
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
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
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  emptyListContent: { flex: 1 },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
