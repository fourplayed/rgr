import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { PhotoListItem } from '@rgr/shared';
import { useSignedUrl } from '../../hooks/usePhotos';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

interface PhotoThumbnailProps {
  photo: PhotoListItem;
  size: number;
  onPress: (photo: PhotoListItem) => void;
}

function PhotoThumbnailComponent({ photo, size, onPress }: PhotoThumbnailProps) {
  const handlePress = useCallback(() => {
    onPress(photo);
  }, [photo, onPress]);

  // Use thumbnail if available, otherwise fall back to full image
  const storagePath = photo.thumbnailPath || photo.storagePath;
  const { data: imageUrl, isLoading, error } = useSignedUrl(storagePath);

  const hasHazard = photo.hazardCount > 0;
  const hasCriticalHazard = photo.maxSeverity === 'critical' || photo.maxSeverity === 'high';

  // Show placeholder while loading or on error
  if (isLoading || !imageUrl) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.placeholder, { width: size, height: size }]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="image"
        accessibilityLabel={`Photo${error ? ' (failed to load)' : ' loading'}`}
      >
        {error && (
          <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="image"
      accessibilityLabel={`Photo${hasHazard ? `, ${photo.hazardCount} hazard${photo.hazardCount !== 1 ? 's' : ''} detected` : ''}${photo.primaryCategory ? ', analyzed' : ''}`}
      accessibilityHint="Double tap to view photo details"
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />

      {/* Hazard indicator */}
      {hasHazard && (
        <View style={[
          styles.hazardBadge,
          hasCriticalHazard && styles.hazardBadgeCritical,
        ]}>
          <Ionicons
            name="warning"
            size={12}
            color={colors.textInverse}
          />
        </View>
      )}

      {/* Analysis indicator */}
      {photo.primaryCategory && (
        <View style={styles.analyzedBadge}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={colors.success}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export const PhotoThumbnail = memo(PhotoThumbnailComponent);

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    flex: 1,
  },
  hazardBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.warning,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hazardBadgeCritical: {
    backgroundColor: colors.error,
  },
  analyzedBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 2,
  },
});
