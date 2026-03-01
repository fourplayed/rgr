import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

const STEPS = [
  'Validating details',
  'Creating account',
  'Setting up profile',
  'Assigning role & depot',
  'Finalising',
] as const;

const STEP_INTERVAL = 600;
const SUCCESS_DISMISS_DELAY = 1000;

type StepStatus = 'pending' | 'in_progress' | 'complete' | 'failed';

interface CreateUserOverlayProps {
  visible: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  onDismiss: () => void;
}

export function CreateUserOverlay({
  visible,
  isSuccess,
  isError,
  error,
  onDismiss,
}: CreateUserOverlayProps) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [failed, setFailed] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start staggered progression when overlay becomes visible
  useEffect(() => {
    if (visible) {
      setCompletedSteps(0);
      setFailed(false);
      setAllDone(false);

      // Animate in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();

      // Immediately complete step 1, then tick the rest
      setCompletedSteps(1);
      let step = 1;
      timerRef.current = setInterval(() => {
        step++;
        // Stop at step 4 — step 5 ("Finalising") waits for mutation
        if (step >= STEPS.length) {
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

    return clearTimer;
  }, [visible, backdropOpacity, cardScale, clearTimer]);

  // On success — complete all steps, then auto-dismiss
  useEffect(() => {
    if (isSuccess && visible) {
      clearTimer();
      setCompletedSteps(STEPS.length);
      setAllDone(true);
      const timeout = setTimeout(() => onDismissRef.current(), SUCCESS_DISMISS_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, visible, clearTimer]);

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
              <Text style={styles.successText}>User Created</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Creating User</Text>
              <View style={styles.stepList}>
                {STEPS.map((label, index) => {
                  const status = getStepStatus(index);
                  return (
                    <View key={label} style={styles.stepRow}>
                      <StepIcon status={status} />
                      <Text
                        style={[
                          styles.stepLabel,
                          status === 'complete' && styles.stepLabelComplete,
                          status === 'failed' && styles.stepLabelFailed,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {failed && error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
              {failed && (
                <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
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
          <LoadingDots color={colors.electricBlue} size={5} />
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
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
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
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_700Bold',
    color: colors.success,
    textTransform: 'uppercase',
  },
});
