import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from './LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { CARD_SPRING, BACKDROP_IN } from '../../theme/animation';
import { AppText } from './AppText';

const STEP_INTERVAL = 600;
const SUCCESS_DISMISS_DELAY = 1000;

type StepStatus = 'pending' | 'in_progress' | 'complete' | 'failed';

interface SteppedProgressOverlayProps {
  visible: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  onDismiss: () => void;
  steps: readonly string[];
  title: string;
  successMessage: string;
}

export function SteppedProgressOverlay({
  visible,
  isSuccess,
  isError,
  error,
  onDismiss,
  steps,
  title,
  successMessage,
}: SteppedProgressOverlayProps) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [failed, setFailed] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start staggered progression when overlay becomes visible
  useEffect(() => {
    let mounted = true;

    if (visible) {
      setCompletedSteps(0);
      setFailed(false);
      setAllDone(false);

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, ...BACKDROP_IN }),
        Animated.spring(cardScale, { toValue: 1, ...CARD_SPRING }),
      ]).start();

      setCompletedSteps(1);
      let step = 1;
      timerRef.current = setInterval(() => {
        if (!mounted) return;
        step++;
        if (step >= steps.length) {
          clearTimer();
          return;
        }
        setCompletedSteps(step);
      }, STEP_INTERVAL);
    } else {
      clearTimer();
      backdropOpacity.setValue(0);
      cardScale.setValue(0.9);
    }

    return () => {
      mounted = false;
      clearTimer();
    };
  }, [visible, backdropOpacity, cardScale, clearTimer, steps.length]);

  // On success — complete all steps, then auto-dismiss
  useEffect(() => {
    if (isSuccess && visible) {
      clearTimer();
      setCompletedSteps(steps.length);
      setAllDone(true);
      const timeout = setTimeout(() => onDismissRef.current(), SUCCESS_DISMISS_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, visible, clearTimer, steps.length]);

  // On error — stop progression, mark failed
  useEffect(() => {
    if (isError && visible) {
      clearTimer();
      setFailed(true);
    }
  }, [isError, visible, clearTimer]);

  const getStepStatus = (index: number): StepStatus => {
    if (failed && index === completedSteps) return 'failed';
    if (index < completedSteps) return 'complete';
    if (index === completedSteps && !failed) return 'in_progress';
    return 'pending';
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          {allDone ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <AppText style={styles.successText}>{successMessage}</AppText>
            </View>
          ) : (
            <>
              <AppText style={styles.title}>{title}</AppText>
              <View style={styles.stepList}>
                {steps.map((label, index) => {
                  const status = getStepStatus(index);
                  return (
                    <View key={label} style={styles.stepRow}>
                      <StepIcon status={status} />
                      <AppText
                        style={[
                          styles.stepLabel,
                          status === 'complete' && styles.stepLabelComplete,
                          status === 'failed' && styles.stepLabelFailed,
                        ]}
                      >
                        {label}
                      </AppText>
                    </View>
                  );
                })}
              </View>
              {failed && error && <AppText style={styles.errorText}>{error}</AppText>}
              {failed && (
                <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                  <AppText style={styles.dismissButtonText}>Dismiss</AppText>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'complete':
      return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
    case 'in_progress':
      return (
        <View style={styles.dotsContainer}>
          <LoadingDots color={colors.textSecondary} size={5} />
        </View>
      );
    case 'failed':
      return <Ionicons name="close-circle" size={20} color={colors.error} />;
    default:
      return <Ionicons name="ellipse-outline" size={20} color={colors.textSecondary} />;
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 320,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stepList: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotsContainer: {
    width: 20,
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  stepLabelComplete: {
    color: colors.success,
  },
  stepLabelFailed: {
    color: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  dismissButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  dismissButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  successText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.success,
    textTransform: 'uppercase',
  },
});
