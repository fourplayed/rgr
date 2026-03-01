import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoThumbnail } from './PhotoThumbnail';
import { LoadingDots } from '../common/LoadingDots';
import { useAssetPhotos, usePrefetchImages } from '../../hooks/usePhotos';
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

interface GalleryItem {
  type: 'photo' | 'add';
  photo?: PhotoListItem;
  id: string;
}

function PhotoGalleryComponent({ assetId, onPhotoPress, onAddPhoto }: PhotoGalleryProps) {
  const { width } = useWindowDimensions();
  const { data: photos, isLoading, error } = useAssetPhotos(assetId);

  // Prefetch first 6 thumbnail URLs for faster gallery loading
  usePrefetchImages(photos);

  // Calculate thumbnail size based on screen width
  const thumbnailSize = useMemo(() => {
    const availableWidth = width - spacing.base * 2 - THUMBNAIL_GAP * (NUM_COLUMNS - 1);
    return Math.floor(availableWidth / NUM_COLUMNS);
  }, [width]);

  // Prepare data - only include add button if onAddPhoto is provided
  const galleryData = useMemo((): GalleryItem[] => {
    const photoItems: GalleryItem[] = (photos || []).map(photo => ({
      type: 'photo' as const,
      photo,
      id: photo.id,
    }));
    if (onAddPhoto) {
      const addItem: GalleryItem = { type: 'add', id: 'add-photo' };
      return [addItem, ...photoItems];
    }
    return photoItems;
  }, [photos, onAddPhoto]);

  const getItemLayout = useCallback((_: ArrayLike<GalleryItem> | null | undefined, index: number) => ({
    length: thumbnailSize + THUMBNAIL_GAP,
    offset: (thumbnailSize + THUMBNAIL_GAP) * Math.floor(index / NUM_COLUMNS),
    index,
  }), [thumbnailSize]);

  const keyExtractor = useCallback((item: GalleryItem) => item.id, []);

  const renderItem = useCallback(({ item }: { item: GalleryItem }) => {
    if (item.type === 'add') {
      return (
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
      );
    }

    if (item.photo) {
      return (
        <PhotoThumbnail
          photo={item.photo}
          size={thumbnailSize}
          onPress={onPhotoPress}
        />
      );
    }

    return null;
  }, [thumbnailSize, onAddPhoto, onPhotoPress]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color={colors.electricBlue} size={8} />
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

  if (galleryData.length === 0) {
    return <Text style={styles.emptyText}>No photos uploaded</Text>;
  }

  return (
    <FlatList
      data={galleryData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

export const PhotoGallery = memo(PhotoGalleryComponent);

const styles = StyleSheet.create({
  container: {
    gap: THUMBNAIL_GAP,
  },
  row: {
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
