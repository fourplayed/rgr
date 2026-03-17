import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatAssetNumber } from '@rgr/shared';
import type { AdminPhotoListItem, PhotoType } from '@rgr/shared';
import { useAdminPhotoList, useAdminBulkDeletePhotos } from '../../src/hooks/useAdminPhotos';
import { PhotoThumbnail } from '../../src/components/photos/PhotoThumbnail';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { AlertSheet } from '../../src/components/common/AlertSheet';
import { AppSearchInput } from '../../src/components/common/AppSearchInput';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { useDebounce } from '../../src/hooks/useDebounce';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';
import { adminStyles } from '../../src/theme/adminStyles';
import { AppText } from '../../src/components/common';

const NUM_COLUMNS = 3;
const THUMBNAIL_GAP = spacing.sm;

export default function PhotosAdminScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const prevSearchRef = useRef(debouncedSearch);
  const effectivePage = prevSearchRef.current !== debouncedSearch ? 1 : page;
  if (prevSearchRef.current !== debouncedSearch) {
    prevSearchRef.current = debouncedSearch;
    setPage(1);
  }

  const thumbnailSize = useMemo(() => {
    const availableWidth = width - spacing.base * 2 - THUMBNAIL_GAP * (NUM_COLUMNS - 1);
    return Math.floor(availableWidth / NUM_COLUMNS);
  }, [width]);

  const queryParams = useMemo(
    () => ({
      page: effectivePage,
      pageSize: 30,
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [effectivePage, debouncedSearch]
  );

  const { data, isLoading, error, refetch } = useAdminPhotoList(queryParams);
  const bulkDeleteMutation = useAdminBulkDeletePhotos();

  const photos = useMemo(() => data?.data ?? [], [data?.data]);
  const totalPages = data?.totalPages ?? 1;

  const enterSelectionMode = useCallback((photoId?: string) => {
    setSelectionMode(true);
    if (photoId) setSelectedIds(new Set([photoId]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  }, [photos, selectedIds.size]);

  const handlePhotoPress = useCallback(
    (photo: AdminPhotoListItem) => {
      if (selectionMode) {
        toggleSelection(photo.id);
      }
    },
    [selectionMode, toggleSelection]
  );

  const handlePhotoLongPress = useCallback(
    (photo: AdminPhotoListItem) => {
      if (!selectionMode) {
        enterSelectionMode(photo.id);
      }
    },
    [selectionMode, enterSelectionMode]
  );

  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteConfirm(false);
    const photoIds = Array.from(selectedIds);
    const totalCount = photoIds.length;

    try {
      const result = await bulkDeleteMutation.mutateAsync(photoIds);
      exitSelectionMode();

      if (result.failed.length > 0) {
        setAlertSheet({
          visible: true,
          title: 'Partial Delete',
          message: `Deleted ${result.deleted} of ${totalCount} photo(s). ${result.failed.length} failed.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete photos';
      setAlertSheet({ visible: true, title: 'Error', message });
    }
  }, [selectedIds, bulkDeleteMutation, exitSelectionMode]);

  const allSelected = photos.length > 0 && selectedIds.size === photos.length;

  const renderItem = useCallback(
    ({ item }: { item: AdminPhotoListItem }) => {
      const isSelected = selectedIds.has(item.id);
      // Map to PhotoThumbnail-compatible shape
      const photoData = {
        id: item.id,
        storagePath: item.storagePath,
        thumbnailPath: item.thumbnailPath,
        photoType: item.photoType as PhotoType,
        createdAt: item.createdAt,
        primaryCategory: null,
        confidence: null,
        hazardCount: 0,
        maxSeverity: null,
      };

      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePhotoPress(item)}
          onLongPress={() => handlePhotoLongPress(item)}
          style={{ position: 'relative' }}
        >
          <PhotoThumbnail photo={photoData} size={thumbnailSize} />
          {selectionMode && (
            <View style={styles.checkboxOverlay}>
              <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleSelected]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
              </View>
            </View>
          )}
          {item.assetNumber && (
            <View style={styles.assetLabel}>
              <AppText style={styles.assetLabelText} numberOfLines={1}>
                {formatAssetNumber(item.assetNumber)}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedIds, selectionMode, thumbnailSize, handlePhotoPress, handlePhotoLongPress]
  );

  const keyExtractor = useCallback((item: AdminPhotoListItem) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={adminStyles.centerContent}>
        <View style={adminStyles.iconContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
        </View>
        <AppText style={adminStyles.emptyText}>No photos</AppText>
        <AppText style={adminStyles.emptySubtext}>Try adjusting your search</AppText>
      </View>
    ),
    []
  );

  return (
    <View style={adminStyles.container}>
      {selectionMode ? (
        <SheetHeader
          icon="images"
          title={`${selectedIds.size} Selected`}
          onClose={exitSelectionMode}
        />
      ) : (
        <SheetHeader
          icon="images"
          title="Photos"
          onClose={() => router.back()}
          closeIcon="arrow-back"
          headerAction={
            photos.length
              ? {
                  icon: 'checkmark-circle',
                  onPress: () => enterSelectionMode(),
                  accessibilityLabel: 'Select photos',
                }
              : undefined
          }
        />
      )}

      {/* Search */}
      <View style={adminStyles.searchContainer}>
        <View style={adminStyles.searchBox}>
          <AppSearchInput
            icon="search"
            placeholder="Search by asset number..."
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

      {/* Select All bar */}
      {selectionMode && photos.length > 0 && (
        <View style={styles.selectAllBar}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
            <Ionicons
              name={allSelected ? 'checkbox' : 'square-outline'}
              size={20}
              color={colors.electricBlue}
            />
            <AppText style={styles.selectAllText}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </AppText>
          </TouchableOpacity>
          <AppText style={styles.selectedCountText}>{selectedIds.size} selected</AppText>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={adminStyles.loadingContainer}>
          <LoadingDots color={colors.textSecondary} size={12} />
        </View>
      ) : error ? (
        <View style={adminStyles.centerContent}>
          <AppText style={adminStyles.errorText}>Failed to load photos</AppText>
          <TouchableOpacity style={adminStyles.retryButton} onPress={() => refetch()}>
            <AppText style={adminStyles.retryButtonText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={photos}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            ListEmptyComponent={renderEmpty}
            removeClippedSubviews
            contentContainerStyle={
              photos.length > 0 ? styles.listContent : adminStyles.emptyListContent
            }
          />

          {/* Pagination */}
          {totalPages > 1 && !selectionMode && (
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

      {/* Bottom toolbar in selection mode */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={styles.bottomToolbar}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteConfirm(true)}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? (
              <LoadingDots color={colors.textInverse} size={6} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
                <AppText style={styles.deleteButtonText}>
                  Delete Selected ({selectedIds.size})
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ConfirmSheet
        visible={showDeleteConfirm}
        type="danger"
        title="Delete Photos"
        message={`Delete ${selectedIds.size} photo(s)? This removes files from storage and cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={bulkDeleteMutation.isPending}
      />

      <AlertSheet
        visible={alertSheet.visible}
        type="error"
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  selectAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectAllText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  selectedCountText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.base,
    gap: THUMBNAIL_GAP,
    paddingBottom: spacing['4xl'],
  },
  row: { gap: THUMBNAIL_GAP },
  checkboxOverlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: colors.electricBlue,
    borderColor: colors.electricBlue,
  },
  assetLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  assetLabelText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textAlign: 'center',
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
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
