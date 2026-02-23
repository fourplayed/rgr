import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { PhotoListItem } from '@rgr/shared';
import { getPublicUrl } from '@rgr/shared';
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
  const imageUrl = getPublicUrl(photo.thumbnailPath || photo.storagePath);

  const hasHazard = photo.hazardCount > 0;
  const hasCriticalHazard = photo.maxSeverity === 'critical' || photo.maxSeverity === 'high';

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={handlePress}
      activeOpacity={0.8}
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
