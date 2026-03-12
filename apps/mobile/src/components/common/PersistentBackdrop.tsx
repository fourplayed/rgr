import React from 'react';
import { Animated, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { BACKDROP_COLOR, BACKDROP_BLUR_INTENSITY, BACKDROP_BLUR_TINT } from '../../theme/backdrop';

interface PersistentBackdropProps {
  opacity: Animated.Value;
  showBackdrop: boolean;
  mounted: boolean;
  onPress: () => void;
}

/**
 * Shared persistent backdrop for modal chaining screens.
 *
 * Renders an animated overlay with BlurView (iOS) that stays visible
 * during A→B modal transitions. Only mounts the BlurView when `mounted`
 * is true to avoid GPU compositing cost when no modal is open.
 */
export function PersistentBackdrop({
  opacity,
  showBackdrop,
  mounted,
  onPress,
}: PersistentBackdropProps) {
  if (!mounted) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}
      pointerEvents={showBackdrop ? 'auto' : 'none'}
    >
      {Platform.OS === 'ios' && (
        <BlurView intensity={BACKDROP_BLUR_INTENSITY} tint={BACKDROP_BLUR_TINT} style={StyleSheet.absoluteFillObject} />
      )}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: BACKDROP_COLOR,
    zIndex: 10,
  },
});
