import React, { useState, useCallback } from 'react';
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
import {
  AssetStatusLabels,
  AssetStatusColors,
  AssetStatus,
  getDepotBadgeColors,
  formatAssetNumber,
} from '@rgr/shared';
import type { AssetWithRelations } from '@rgr/shared';
import { useAssetList } from '../../src/hooks/useAssetData';
import { useDepotLookup } from '../../src/hooks/useDepots';
import {
  useDeleteAsset,
  useBulkUpdateStatus,
  useBulkDeleteAssets,
  useAssetRelatedCounts,
} from '../../src/hooks/useAdminAssets';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { SheetModal } from '../../src/components/common/SheetModal';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';

const STATUS_VALUES: string[] = [AssetStatus.SERVICED, AssetStatus.MAINTENANCE, AssetStatus.OUT_OF_SERVICE];

export default function AssetAdminScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AssetWithRelations | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  const { data, isLoading, error, refetch } = useAssetList({
    ...(debouncedSearch && { search: debouncedSearch }),
    pageSize: 50,
  });

  const assets = data?.data ?? [];

  const depotLookup = useDepotLookup();

  const deleteMutation = useDeleteAsset();
  const bulkDeleteMutation = useBulkDeleteAssets();
  const bulkStatusMutation = useBulkUpdateStatus();
  const { data: relatedCounts } = useAssetRelatedCounts(deleteTarget?.id ?? null);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
      },
    });
  }, [deleteTarget, deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (bulkDeleteIds.length === 0) return;
    bulkDeleteMutation.mutate(bulkDeleteIds, {
      onSuccess: () => {
        setBulkDeleteIds([]);
        clearSelection();
      },
      onError: () => {
        setBulkDeleteIds([]);
      },
    });
  }, [bulkDeleteIds, bulkDeleteMutation, clearSelection]);

  const handleBulkStatus = useCallback(
    (status: string) => {
      setShowStatusPicker(false);
      bulkStatusMutation.mutate(
        { ids: Array.from(selectedIds), status: status as AssetWithRelations['status'] },
        { onSuccess: () => clearSelection() }
      );
    },
    [selectedIds, bulkStatusMutation, clearSelection]
  );

  const keyExtractor = useCallback((item: AssetWithRelations) => item.id, []);

  const handleOpenPhotos = useCallback(
    (item: AssetWithRelations) => {
      router.push({
        pathname: '/(admin)/asset-photos',
        params: { assetId: item.id, assetNumber: item.assetNumber },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: AssetWithRelations }) => {
      const isSelected = selectedIds.has(item.id);
      const statusColor =
        AssetStatusColors[item.status as keyof typeof AssetStatusColors] ||
        colors.electricBlue;
      const depot = item.depotCode ? depotLookup.byCode.get(item.depotCode.toLowerCase()) ?? null : null;
      const depotBadgeColors = item.depotCode ? getDepotBadgeColors(depot, colors.chrome, colors.text) : null;

      return (
        <TouchableOpacity
          style={[
            styles.assetItem,
            { borderLeftColor: statusColor },
            isSelected && styles.assetItemSelected,
          ]}
          onPress={() => toggleSelection(item.id)}
          onLongPress={() => setDeleteTarget(item)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={`${formatAssetNumber(item.assetNumber)}, ${AssetStatusLabels[item.status as keyof typeof AssetStatusLabels] || item.status}`}
        >
          {item.photoCount > 0 && (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => handleOpenPhotos(item)}
              accessibilityRole="button"
              accessibilityLabel={`View photos for ${formatAssetNumber(item.assetNumber)}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={styles.checkbox}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={colors.electricBlue} />
            )}
          </View>
          <View style={styles.assetInfo}>
            <View style={styles.assetHeaderRow}>
              <Text style={styles.assetNumber}>{formatAssetNumber(item.assetNumber)}</Text>
              <View style={styles.badgeRow}>
                {item.depotName && depotBadgeColors && (
                  <View style={[styles.depotBadge, { backgroundColor: depotBadgeColors.bg }]}>
                    <Text style={[styles.depotBadgeText, { color: depotBadgeColors.text }]}>
                      {item.depotName}
                    </Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusBadgeText}>
                    {AssetStatusLabels[item.status as keyof typeof AssetStatusLabels] || item.status}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.assetFooterRow}>
              <Text style={styles.assetSubtext} numberOfLines={1}>
                {item.subtype || item.category}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleSelection, handleOpenPhotos, depotLookup]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyText}>No assets found</Text>
        <Text style={styles.emptySubtext}>Try adjusting your search</Text>
      </View>
    ),
    []
  );

  const hasSelection = selectedIds.size > 0;

  return (
    <View style={styles.container}>
        {/* Header */}
        {hasSelection ? (
          <SheetHeader
            icon="cube"
            title={`${selectedIds.size} Selected`}
            onClose={clearSelection}
          />
        ) : (
          <SheetHeader
            icon="cube"
            title="Asset Admin"
            onClose={() => router.back()}
            closeIcon="arrow-back"
            headerAction={{
              icon: 'add-circle',
              onPress: () => router.push('/(admin)/create-asset'),
              accessibilityLabel: 'Add asset',
            }}
          />
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assets..."
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

        {/* Toolbar */}
        {hasSelection && (
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolbarButton, styles.toolbarButtonDanger]}
              onPress={() => {
                if (selectedIds.size === 1) {
                  const firstId = Array.from(selectedIds)[0];
                  const asset = assets.find((a) => a.id === firstId);
                  if (asset) setDeleteTarget(asset);
                } else {
                  setBulkDeleteIds(Array.from(selectedIds));
                }
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.toolbarButtonText, { color: colors.error }]}>
                Delete{selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => setShowStatusPicker(true)}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.electricBlue} />
              <Text style={[styles.toolbarButtonText, { color: colors.electricBlue }]}>
                Change Status
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bulk status result */}
        {bulkStatusMutation.isSuccess && bulkStatusMutation.data && (
          <View style={styles.resultBanner}>
            <Text style={styles.resultText}>
              Updated {bulkStatusMutation.data.updated} of {bulkStatusMutation.data.total} assets
            </Text>
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load assets</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={assets}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={renderEmpty}
            removeClippedSubviews
            contentContainerStyle={
              assets.length === 0 ? styles.emptyListContent : styles.listContent
            }
          />
        )}

        {/* Delete Confirm */}
        <ConfirmSheet
          visible={!!deleteTarget}
          type="danger"
          title="Delete Asset"
          message={
            deleteTarget
              ? `Soft-delete "${formatAssetNumber(deleteTarget.assetNumber)}"? This sets status to Out of Service.${
                  relatedCounts
                    ? `\n\nRelated records: ${relatedCounts.scanEvents} scans, ${relatedCounts.maintenanceRecords} maintenance records (preserved).`
                    : ''
                }`
              : ''
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />

        {/* Bulk Delete Confirm */}
        <ConfirmSheet
          visible={bulkDeleteIds.length > 0}
          type="danger"
          title={`Delete ${bulkDeleteIds.length} Assets?`}
          message={`This will soft-delete ${bulkDeleteIds.length} selected assets, setting their status to Out of Service.`}
          confirmLabel={`Delete ${bulkDeleteIds.length}`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteIds([])}
          isLoading={bulkDeleteMutation.isPending}
        />

        {/* Status Picker Sheet */}
        <SheetModal visible={showStatusPicker} onClose={() => setShowStatusPicker(false)}>
          <View style={styles.statusPickerSheet}>
            <Text style={styles.statusPickerTitle}>Change Status</Text>
            {STATUS_VALUES.map((status) => {
              const color =
                AssetStatusColors[status as keyof typeof AssetStatusColors] ||
                colors.electricBlue;
              return (
                <TouchableOpacity
                  key={status}
                  style={styles.statusOption}
                  onPress={() => handleBulkStatus(status)}
                >
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={styles.statusOptionText}>
                    {AssetStatusLabels[status as keyof typeof AssetStatusLabels] || status}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.statusCancelButton}
              onPress={() => setShowStatusPicker(false)}
            >
              <Text style={styles.statusCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SheetModal>
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
  resultBanner: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
  },
  resultText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.success,
    textAlign: 'center',
  },
  assetItem: {
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
  assetItemSelected: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '08',
  },
  cameraButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  assetInfo: { flex: 1 },
  assetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  depotBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  depotBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  assetFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetSubtext: {
    flex: 1,
    fontSize: fontSize.sm,
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
  listContent: { paddingTop: spacing.sm, paddingBottom: spacing['2xl'], paddingHorizontal: spacing.lg },
  emptyListContent: { flex: 1 },
  // Status picker sheet
  statusPickerSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  statusPickerTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  statusCancelButton: {
    height: 48,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCancelText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
});
