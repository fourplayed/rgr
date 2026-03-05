import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoThumbnail } from './PhotoThumbnail';
import { LoadingDots } from '../common/LoadingDots';
import { useAssetPhotos, usePrefetchImages, useBatchSignedUrls } from '../../hooks/usePhotos';
import type { PhotoListItem } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const NUM_COLUMNS = 3;
const THUMBNAIL_GAP = spacing.sm;

interface PhotoGalleryProps {
  assetId: string;
  onPhotoPress: (photo: PhotoListItem) => void;
  onAddPhoto?: () => void;
}

// Uses ScrollView instead of FlatList/SectionList because:
// - SectionList doesn't support numColumns in React Native
// - The query returns ≤20 photos, so virtualization is unnecessary
function PhotoGalleryComponent({ assetId, onPhotoPress, onAddPhoto }: PhotoGalleryProps) {
  const { width } = useWindowDimensions();
  const { data: photos, isLoading, error } = useAssetPhotos(assetId);

  // Prefetch first 6 thumbnail URLs for faster gallery loading
  usePrefetchImages(photos);

  // Batch-fetch all signed URLs in a single request instead of N individual requests
  const allPaths = useMemo(
    () => (photos || []).map(p => p.thumbnailPath ?? p.storagePath).filter((p): p is string => !!p),
    [photos]
  );
  const { data: signedUrlMap } = useBatchSignedUrls(allPaths);

  // Calculate thumbnail size based on screen width
  const thumbnailSize = useMemo(() => {
    const availableWidth = width - spacing.base * 2 - THUMBNAIL_GAP * (NUM_COLUMNS - 1);
    return Math.floor(availableWidth / NUM_COLUMNS);
  }, [width]);

  // Split photos into freight (catches legacy inspection/general too) and defects
  const freightPhotos = useMemo(
    () => (photos || []).filter(p => p.photoType !== 'damage'),
    [photos],
  );
  const defectPhotos = useMemo(
    () => (photos || []).filter(p => p.photoType === 'damage'),
    [photos],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots size={8} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>Failed to load photos</Text>
      </View>
    );
  }

  const hasPhotos = (photos || []).length > 0;

  // No photos and no add button — simple empty state
  if (!hasPhotos && !onAddPhoto) {
    return <Text style={styles.emptyText}>No photos uploaded</Text>;
  }

  // No photos but add button available — show just the add button without noisy section headers
  if (!hasPhotos && onAddPhoto) {
    return (
      <View style={styles.grid}>
        <TouchableOpacity
          style={[
            styles.addButton,
            { width: thumbnailSize, height: thumbnailSize },
          ]}
          onPress={onAddPhoto}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          accessibilityHint="Double tap to open camera and take a photo"
        >
          <Ionicons name="camera" size={32} color={colors.electricBlue} />
          <Text style={styles.addButtonText}>Add Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Freight Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          FREIGHT{' '}
          <Text style={styles.sectionCount}>({freightPhotos.length})</Text>
        </Text>
      </View>
      {freightPhotos.length === 0 && !onAddPhoto ? (
        <Text style={styles.sectionEmptyText}>No freight photos</Text>
      ) : (
        <View style={styles.grid}>
          {onAddPhoto && (
            <TouchableOpacity
              style={[
                styles.addButton,
                { width: thumbnailSize, height: thumbnailSize },
              ]}
              onPress={onAddPhoto}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              accessibilityHint="Double tap to open camera and take a photo"
            >
              <Ionicons name="camera" size={32} color={colors.electricBlue} />
              <Text style={styles.addButtonText}>Add Photo</Text>
            </TouchableOpacity>
          )}
          {freightPhotos.map(photo => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              size={thumbnailSize}
              onPress={onPhotoPress}
              resolvedUrl={signedUrlMap?.[photo.thumbnailPath ?? photo.storagePath]}
            />
          ))}
        </View>
      )}

      {/* Defects Section */}
      <View style={[styles.sectionHeader, styles.defectSectionHeader]}>
        <Text style={styles.defectSectionTitle}>
          DEFECTS{' '}
          <Text style={styles.sectionCount}>({defectPhotos.length})</Text>
        </Text>
      </View>
      {defectPhotos.length === 0 ? (
        <Text style={styles.sectionEmptyText}>No defect photos</Text>
      ) : (
        <View style={styles.grid}>
          {defectPhotos.map(photo => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              size={thumbnailSize}
              onPress={onPhotoPress}
              resolvedUrl={signedUrlMap?.[photo.thumbnailPath ?? photo.storagePath]}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export const PhotoGallery = memo(PhotoGalleryComponent);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMBNAIL_GAP,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  defectSectionHeader: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  defectSectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCount: {
    color: colors.textSecondary,
  },
  sectionEmptyText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.electricBlue,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
});
