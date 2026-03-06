import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing, borderRadius } from '../../theme/spacing';

const DISPLAY_DURATION = 1200;
const FADE_DURATION = 200;

interface ScanSuccessFlashProps {
  visible: boolean;
  assetNumber: string;
  photoCompleted: boolean;
  defectCompleted: boolean;
  maintenanceCompleted: boolean;
  onDismiss: () => void;
}

export function ScanSuccessFlash({
  visible,
  assetNumber,
  photoCompleted,
  defectCompleted,
  maintenanceCompleted,
  onDismiss,
}: ScanSuccessFlashProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }

    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss: hold, then fade out
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismissRef.current();
      });
    }, DISPLAY_DURATION);

    return () => clearTimeout(timer);
  }, [visible, opacity]);

  if (!visible) return null;

  const hasChips = photoCompleted || defectCompleted || maintenanceCompleted;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={64} color="#fff" />
      <Text style={styles.assetNumber}>{assetNumber}</Text>
      <Text style={styles.subtitle}>Scanned</Text>
      {hasChips && (
        <View style={styles.chipRow}>
          {photoCompleted && (
            <View style={styles.chip}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.chipText}>Photo</Text>
            </View>
          )}
          {defectCompleted && (
            <View style={styles.chip}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.chipText}>Defect</Text>
            </View>
          )}
          {maintenanceCompleted && (
            <View style={styles.chip}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.chipText}>Maintenance</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  assetNumber: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: '#fff',
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_400Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: '#fff',
  },
});
