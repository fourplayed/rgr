import React, { useEffect, useRef } from 'react';
import { View, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';

export type ScanStep = 'detected' | 'location' | 'lookup' | 'invalid';

const SCAN_STEPS = [
  { key: 'detected', label: 'QR code detected' },
  { key: 'location', label: 'Resolving location' },
  { key: 'lookup', label: 'Looking up asset' },
] as const;

const STEP_KEYS = SCAN_STEPS.map((s) => s.key);

interface ScanProgressOverlayProps {
  step: ScanStep;
}

function ScanProgressOverlayComponent({ step }: ScanProgressOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const isError = step === 'invalid';
  const currentIndex = isError ? -1 : STEP_KEYS.indexOf(step);

  return (
    <Animated.View style={[overlayStyles.container, { opacity }]}>
      <View style={overlayStyles.card}>
        {SCAN_STEPS.map((s, i) => {
          const isComplete = !isError && i < currentIndex;
          const isCurrent = !isError && i === currentIndex;

          return (
            <View key={s.key} style={overlayStyles.row}>
              {isComplete ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              ) : isCurrent ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="ellipse-outline" size={22} color="rgba(255,255,255,0.3)" />
              )}
              <AppText
                style={[
                  overlayStyles.label,
                  isComplete && overlayStyles.labelComplete,
                  isCurrent && overlayStyles.labelCurrent,
                ]}
              >
                {s.label}
              </AppText>
            </View>
          );
        })}
        {isError && (
          <View style={overlayStyles.errorRow}>
            <Ionicons name="close-circle" size={22} color={colors.error} />
            <AppText style={overlayStyles.errorText}>Not a valid asset code</AppText>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export const ScanProgressOverlay = React.memo(ScanProgressOverlayComponent);

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 28,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  labelComplete: {
    color: colors.success,
    fontFamily: fonts.bold,
  },
  labelCurrent: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 28,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.error,
  },
});
