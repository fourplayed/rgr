import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common/AppText';

export type ScanStep = 'detected' | 'location' | 'lookup' | 'invalid';

const SCAN_STEPS = [
  { key: 'detected', label: 'QR code detected' },
  { key: 'location', label: 'Resolving location' },
  { key: 'lookup', label: 'Looking up asset' },
] as const;

const STEP_KEYS = SCAN_STEPS.map((s) => s.key);

const LOCATION_MESSAGES = [
  { after: 0, text: 'Acquiring location...' },
  { after: 5000, text: 'Getting precise fix...' },
  { after: 10000, text: 'Trying alternative signal...' },
  { after: 18000, text: 'Almost there...' },
] as const;

interface ScanProgressOverlayProps {
  step: ScanStep;
}

function ScanProgressOverlayComponent({ step }: ScanProgressOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [locationSubText, setLocationSubText] = useState<string | null>(null);
  const prevStepRef = useRef(step);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  // Time-aware sub-text for location step
  useEffect(() => {
    if (step !== 'location') {
      setLocationSubText(null);
      return;
    }
    setLocationSubText(LOCATION_MESSAGES[0].text);
    const timers = LOCATION_MESSAGES.slice(1).map(({ after, text }) =>
      setTimeout(() => setLocationSubText(text), after)
    );
    return () => timers.forEach(clearTimeout);
  }, [step]);

  // Haptic on location → lookup transition
  useEffect(() => {
    if (prevStepRef.current === 'location' && step === 'lookup') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevStepRef.current = step;
  }, [step]);

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
              <View>
                <AppText
                  style={[
                    overlayStyles.label,
                    isComplete && overlayStyles.labelComplete,
                    isCurrent && overlayStyles.labelCurrent,
                  ]}
                >
                  {s.label}
                </AppText>
                {s.key === 'location' && locationSubText && (
                  <AppText style={overlayStyles.locationSubText}>{locationSubText}</AppText>
                )}
              </View>
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
  locationSubText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
});
