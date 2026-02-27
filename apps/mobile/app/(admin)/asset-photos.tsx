import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { PhotoListItem } from '@rgr/shared';
import { useAssetPhotos, usePrefetchImages, useBulkDeletePhotos } from '../../src/hooks/usePhotos';
import { PhotoThumbnail } from '../../src/components/photos/PhotoThumbnail';
import { PhotoDetailModal } from '../../src/components/photos/PhotoDetailModal';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { AlertSheet } from '../../src/components/common/AlertSheet';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';

const NUM_COLUMNS = 3;
const THUMBNAIL_GAP = spacing.sm;

export default function AssetPhotosScreen() {
  const router = useRouter();
  const { assetId, assetNumber } = useLocalSearchParams<{
    assetId: string;
    assetNumber: string;
  }>();
  const { width } = useWindowDimensions();

  const { data: photos, isLoading, error, refetch } = useAssetPhotos(assetId);
  usePrefetchImages(photos ?? undefined);

  const bulkDeleteMutation = useBulkDeletePhotos();

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [detailPhotoId, setDetailPhotoId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const thumbnailSize = useMemo(() => {
    const availableWidth = width - spacing.base * 2 - THUMBNAIL_GAP * (NUM_COLUMNS - 1);
    return Math.floor(availableWidth / NUM_COLUMNS);
  }, [width]);

  // Selection handlers
  const enterSelectionMode = useCallback((photoId?: string) => {
    setSelectionMode(true);
    if (photoId) {
      setSelectedIds(new Set([photoId]));
    }
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!photos) return;
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  }, [photos, selectedIds.size]);

  // Photo press handlers
  const handlePhotoPress = useCallback(
    (photo: PhotoListItem) => {
      if (selectionMode) {
        toggleSelection(photo.id);
      } else {
        setDetailPhotoId(photo.id);
      }
    },
    [selectionMode, toggleSelection]
  );

  const handlePhotoLongPress = useCallback(
    (photo: PhotoListItem) => {
      if (!selectionMode) {
        enterSelectionMode(photo.id);
      }
    },
    [selectionMode, enterSelectionMode]
  );

  // Delete handlers
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  }, [selectedIds.size]);

  const handleConfirmDelete = useCallback(async () => {
    if (!assetId || selectedIds.size === 0) return;
    setShowDeleteConfirm(false);

    const photoIds = Array.from(selectedIds);
    const totalCount = photoIds.length;

    try {
      const result = await bulkDeleteMutation.mutateAsync({ photoIds, assetId });

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
      setAlertSheet({
        visible: true,
        title: 'Error',
        message,
      });
    }
  }, [assetId, selectedIds, bulkDeleteMutation, exitSelectionMode]);

  const allSelected = photos ? selectedIds.size === photos.length && photos.length > 0 : false;

  const renderItem = useCallback(
    ({ item }: { item: PhotoListItem }) => {
      const isSelected = selectedIds.has(item.id);

      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePhotoPress(item)}
          onLongPress={() => handlePhotoLongPress(item)}
          style={{ position: 'relative' }}
        >
          <PhotoThumbnail
            photo={item}
            size={thumbnailSize}
            onPress={handlePhotoPress}
          />
          {selectionMode && (
            <View style={styles.checkboxOverlay}>
              <View
                style={[
                  styles.checkboxCircle,
                  isSelected && styles.checkboxCircleSelected,
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedIds, selectionMode, thumbnailSize, handlePhotoPress, handlePhotoLongPress]
  );

  const keyExtractor = useCallback((item: PhotoListItem) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyText}>No photos</Text>
        <Text style={styles.emptySubtext}>
          No photos have been uploaded for this asset
        </Text>
      </View>
    ),
    []
  );

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {assetNumber ? `${assetNumber} Photos` : 'Photos'}
          </Text>
          {selectionMode ? (
            <TouchableOpacity
              onPress={exitSelectionMode}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel selection"
            >
              <Text style={styles.headerActionText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => enterSelectionMode()}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Select photos"
              disabled={!photos?.length}
            >
              <Text
                style={[
                  styles.headerActionText,
                  !photos?.length && styles.headerActionDisabled,
                ]}
              >
                Select
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Select All bar */}
        {selectionMode && photos && photos.length > 0 && (
          <View style={styles.selectAllBar}>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
              <Ionicons
                name={allSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={colors.electricBlue}
              />
              <Text style={styles.selectAllText}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCountText}>
              {selectedIds.size} selected
            </Text>
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.electricBlue} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load photos</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            ListEmptyComponent={renderEmpty}
            removeClippedSubviews
            contentContainerStyle={
              photos && photos.length > 0
                ? styles.listContent
                : styles.emptyListContent
            }
          />
        )}

        {/* Bottom toolbar in selection mode */}
        {selectionMode && selectedIds.size > 0 && (
          <View style={styles.bottomToolbar}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteSelected}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <LoadingDots color={colors.textInverse} size={6} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
                  <Text style={styles.deleteButtonText}>
                    Delete Selected ({selectedIds.size})
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSelectedIds(new Set())}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Photo Detail Modal */}
      {detailPhotoId && assetId && (
        <PhotoDetailModal
          visible={!!detailPhotoId}
          photoId={detailPhotoId}
          assetId={assetId}
          onClose={() => setDetailPhotoId(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmSheet
        visible={showDeleteConfirm}
        type="danger"
        title="Delete Photos"
        message={`Delete ${selectedIds.size} photo(s)? This removes files from storage and cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={bulkDeleteMutation.isPending}
      />

      {/* Alert Sheet */}
      <AlertSheet
        visible={alertSheet.visible}
        type="error"
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet((prev) => ({ ...prev, visible: false }))}
      />
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
  headerButton: { padding: spacing.sm },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerActionText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  headerActionDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
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
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  selectedCountText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.base,
    gap: THUMBNAIL_GAP,
    paddingBottom: spacing['4xl'],
  },
  emptyListContent: { flex: 1 },
  row: {
    gap: THUMBNAIL_GAP,
  },
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
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
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
});
