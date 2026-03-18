import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MaintenanceStatus, formatAssetNumber, formatRelativeTime } from '@rgr/shared';
import type { AdminMaintenanceListItem } from '@rgr/shared/admin';
import {
  useAdminMaintenanceList,
  useBulkCancelMaintenance,
} from '../../src/hooks/useAdminMaintenance';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { FilterChip } from '../../src/components/common/FilterChip';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { AppSearchInput } from '../../src/components/common/AppSearchInput';
import {
  getMaintenanceVisualConfig,
  MaintenanceStatusBadge,
} from '../../src/components/maintenance';
import { useDebounce } from '../../src/hooks/useDebounce';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';
import { adminStyles } from '../../src/theme/adminStyles';
import { AppText } from '../../src/components/common';

const STATUS_FILTERS: { value: MaintenanceStatus; label: string }[] = [
  { value: MaintenanceStatus.SCHEDULED, label: 'Scheduled' },
  { value: MaintenanceStatus.COMPLETED, label: 'Completed' },
  { value: MaintenanceStatus.CANCELLED, label: 'Cancelled' },
];

export default function MaintenanceAdminScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);

  const toggleStatusFilter = useCallback((status: MaintenanceStatus) => {
    setStatusFilter((prev) => {
      const next = prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status];
      return next;
    });
    setPage(1);
  }, []);

  const prevSearchRef = useRef(debouncedSearch);
  const effectivePage = prevSearchRef.current !== debouncedSearch ? 1 : page;
  if (prevSearchRef.current !== debouncedSearch) {
    prevSearchRef.current = debouncedSearch;
    setPage(1);
  }

  const queryParams = useMemo(
    () => ({
      page: effectivePage,
      pageSize: 30,
      ...(statusFilter.length > 0 && { status: statusFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [effectivePage, statusFilter, debouncedSearch]
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
      const { color } = getMaintenanceVisualConfig(item.status as MaintenanceStatus, item.dueDate);

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
            {isSelected && <Ionicons name="checkmark" size={16} color={colors.electricBlue} />}
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemHeaderRow}>
              <AppText style={styles.itemAssetNumber} numberOfLines={1}>
                {item.assetNumber ? formatAssetNumber(item.assetNumber) : 'Unknown Asset'}
              </AppText>
              <MaintenanceStatusBadge status={item.status as MaintenanceStatus} />
            </View>
            <AppText style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText style={styles.itemTime}>
              {formatRelativeTime(item.createdAt)}
              {item.reporterName ? ` · ${item.reporterName}` : ''}
            </AppText>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleSelection]
  );

  const keyExtractor = useCallback((item: AdminMaintenanceListItem) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={adminStyles.centerContent}>
        <View style={adminStyles.iconContainer}>
          <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
        </View>
        <AppText style={adminStyles.emptyText}>No maintenance tasks</AppText>
        <AppText style={adminStyles.emptySubtext}>Try adjusting your filters</AppText>
      </View>
    ),
    []
  );

  return (
    <View style={adminStyles.container}>
      {hasSelection ? (
        <SheetHeader
          icon="construct"
          title={`${selectedIds.size} Selected`}
          onClose={clearSelection}
          backgroundColor={colors.electricBlue}
        />
      ) : (
        <SheetHeader
          icon="construct"
          title="Maintenance"
          onClose={() => router.back()}
          closeIcon="arrow-back"
          backgroundColor={colors.electricBlue}
        />
      )}

      {/* Search */}
      <View style={adminStyles.searchContainer}>
        <View style={adminStyles.searchBox}>
          <AppSearchInput
            icon="search"
            placeholder="Search tasks..."
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
        <View style={adminStyles.toolbar}>
          <TouchableOpacity
            style={[adminStyles.toolbarButton, adminStyles.toolbarButtonDanger]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <AppText style={[adminStyles.toolbarButtonText, { color: colors.error }]}>
              Cancel{selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={adminStyles.loadingContainer}>
          <LoadingDots color={colors.textSecondary} size={12} />
        </View>
      ) : error ? (
        <View style={adminStyles.centerContent}>
          <AppText style={adminStyles.errorText}>Failed to load tasks</AppText>
          <TouchableOpacity style={adminStyles.retryButton} onPress={() => refetch()}>
            <AppText style={adminStyles.retryButtonText}>Retry</AppText>
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
              items.length === 0 ? adminStyles.emptyListContent : adminStyles.listContent
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
              <AppText style={styles.pageText}>
                {page} / {totalPages}
              </AppText>
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
  filterRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
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
