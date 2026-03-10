import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  MaintenanceStatus,
  formatAssetNumber,
  formatRelativeTime,
} from '@rgr/shared';
import type { AdminMaintenanceListItem } from '@rgr/shared';
import {
  useAdminMaintenanceList,
  useBulkCancelMaintenance,
} from '../../src/hooks/useAdminMaintenance';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { FilterChip } from '../../src/components/common/FilterChip';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import {
  getMaintenanceVisualConfig,
  MaintenanceStatusBadge,
} from '../../src/components/maintenance';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';

const STATUS_FILTERS: { value: MaintenanceStatus; label: string }[] = [
  { value: MaintenanceStatus.SCHEDULED, label: 'Scheduled' },
  { value: MaintenanceStatus.COMPLETED, label: 'Completed' },
  { value: MaintenanceStatus.CANCELLED, label: 'Cancelled' },
];

export default function MaintenanceAdminScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);

  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
    }, 300);
  }, []);

  const toggleStatusFilter = useCallback((status: MaintenanceStatus) => {
    setStatusFilter((prev) => {
      const next = prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status];
      return next;
    });
    setPage(1);
  }, []);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 30,
      ...(statusFilter.length > 0 && { status: statusFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [page, statusFilter, debouncedSearch]
  );

  const { data, isLoading, error, refetch } = useAdminMaintenanceList(queryParams);
  const bulkCancelMutation = useBulkCancelMaintenance();

  const items = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkCancel = useCallback(async () => {
    setShowDeleteConfirm(false);
    const ids = Array.from(selectedIds);
    await bulkCancelMutation.mutateAsync(ids);
    clearSelection();
  }, [selectedIds, bulkCancelMutation, clearSelection]);

  const hasSelection = selectedIds.size > 0;

  const renderItem = useCallback(
    ({ item }: { item: AdminMaintenanceListItem }) => {
      const isSelected = selectedIds.has(item.id);
      const { color } = getMaintenanceVisualConfig(
        item.status as MaintenanceStatus,
        item.dueDate
      );

      return (
        <TouchableOpacity
          style={[
            styles.listItem,
            { borderLeftColor: color },
            isSelected && styles.listItemSelected,
          ]}
          onPress={() => toggleSelection(item.id)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
        >
          <View style={styles.checkbox}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={colors.electricBlue} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemHeaderRow}>
              <Text style={styles.itemAssetNumber} numberOfLines={1}>
                {item.assetNumber
                  ? formatAssetNumber(item.assetNumber)
                  : 'Unknown Asset'}
              </Text>
              <MaintenanceStatusBadge status={item.status as MaintenanceStatus} />
            </View>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemTime}>
              {formatRelativeTime(item.createdAt)}
              {item.reporterName ? ` · ${item.reporterName}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleSelection]
  );

  const keyExtractor = useCallback((item: AdminMaintenanceListItem) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyText}>No maintenance tasks</Text>
        <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
        {hasSelection ? (
          <SheetHeader
            icon="construct"
            title={`${selectedIds.size} Selected`}
            onClose={clearSelection}
            backgroundColor={colors.warning}
          />
        ) : (
          <SheetHeader
            icon="construct"
            title="Maintenance"
            onClose={() => router.back()}
            closeIcon="arrow-back"
            backgroundColor={colors.warning}
          />
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
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

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              isSelected={statusFilter.includes(filter.value)}
              onPress={() => toggleStatusFilter(filter.value)}
            />
          ))}
        </ScrollView>

        {/* Toolbar */}
        {hasSelection && (
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolbarButton, styles.toolbarButtonDanger]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.toolbarButtonText, { color: colors.error }]}>
                Cancel{selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load tasks</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              ListEmptyComponent={renderEmpty}
              removeClippedSubviews
              contentContainerStyle={
                items.length === 0 ? styles.emptyListContent : styles.listContent
              }
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={page <= 1 ? colors.textSecondary : colors.text}
                  />
                </TouchableOpacity>
                <Text style={styles.pageText}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={page >= totalPages ? colors.textSecondary : colors.text}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <ConfirmSheet
          visible={showDeleteConfirm}
          type="danger"
          title={`Cancel ${selectedIds.size} Task${selectedIds.size > 1 ? 's' : ''}?`}
          message="This will cancel the selected maintenance tasks and resolve any linked defect reports."
          confirmLabel={`Cancel ${selectedIds.size}`}
          onConfirm={handleBulkCancel}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={bulkCancelMutation.isPending}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.chrome, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, overflow: 'hidden' as const },
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
  filterRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  toolbarButtonDanger: {
    borderColor: colors.error + '40',
  },
  toolbarButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  listItemSelected: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '08',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemAssetNumber: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemTime: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  listContent: { paddingTop: spacing.sm, paddingBottom: spacing['2xl'] },
  emptyListContent: { flex: 1 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
  },
});
