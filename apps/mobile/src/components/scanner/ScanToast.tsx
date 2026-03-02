import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { UNDO_TOAST_DURATION_MS } from './constants';

interface ScanToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'info' | 'link' | undefined;
  onUndo?: (() => void) | undefined;
  onDismiss: () => void;
  duration?: number | undefined;
  /** Unique ID per toast — change triggers remount-like reset of timer/animation. */
  toastId?: number | undefined;
  /** Called when undo window opens (toast with onUndo becomes visible). */
  onUndoWindowOpen?: (() => void) | undefined;
  /** Called when undo window closes (timeout, manual dismiss, or undo pressed). */
  onUndoWindowClose?: (() => void) | undefined;
}

export function ScanToast({
  visible,
  message,
  type = 'success',
  onUndo,
  onDismiss,
  duration = UNDO_TOAST_DURATION_MS,
  toastId,
  onUndoWindowOpen,
  onUndoWindowClose,
}: ScanToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  // Countdown opacity: 1 → 0 over the full duration (visual hint of time remaining)
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const onDismissRef = useRef(onDismiss);
  const onUndoWindowCloseRef = useRef(onUndoWindowClose);
  const onUndoWindowOpenRef = useRef(onUndoWindowOpen);
  const hasUndoRef = useRef(!!onUndo);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => { onUndoWindowCloseRef.current = onUndoWindowClose; }, [onUndoWindowClose]);
  useEffect(() => { onUndoWindowOpenRef.current = onUndoWindowOpen; }, [onUndoWindowOpen]);
  useEffect(() => { hasUndoRef.current = !!onUndo; }, [onUndo]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownAnimRef.current) {
      countdownAnimRef.current.stop();
      countdownAnimRef.current = null;
    }
  }, []);

  // Reset timer and animation when toastId changes (new toast replaces old)
  useEffect(() => {
    if (!visible) return;

    // Stop any in-flight animations to prevent race conditions
    opacity.stopAnimation();
    translateY.stopAnimation();

    // Animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Reset and start countdown
    clearTimer();
    countdownOpacity.setValue(1);

    if (onUndo) {
      // Start the fading countdown for undo toasts
      const anim = Animated.timing(countdownOpacity, {
        toValue: 0.3,
        duration,
        useNativeDriver: true,
      });
      countdownAnimRef.current = anim;
      anim.start();

      // Notify that undo window is open
      onUndoWindowOpenRef.current?.();
    }

    timerRef.current = setTimeout(() => {
      if (hasUndoRef.current) {
        onUndoWindowCloseRef.current?.();
      }
      onDismissRef.current();
    }, duration);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toastId triggers full reset
  }, [toastId, visible]);

  // Handle hide animation when visible goes false
  useEffect(() => {
    if (!visible) {
      // Stop any in-flight animations to prevent race conditions
      opacity.stopAnimation();
      translateY.stopAnimation();

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      clearTimer();
    }
  }, [visible, opacity, translateY, clearTimer]);

  if (!visible) return null;

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'link' ? 'link' : 'information-circle';
  const iconColor = type === 'success' ? colors.success : type === 'link' ? colors.electricBlue : colors.info;
  const bgColor = type === 'success' ? colors.success + '20' : type === 'link' ? colors.electricBlue + '20' : colors.info + '20';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={18} color={iconColor} />
        <Text style={[styles.message, { color: iconColor }]} numberOfLines={1}>
          {message}
        </Text>
      </View>
      {onUndo && (
        <Animated.View style={{ opacity: countdownOpacity }}>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => {
              clearTimer();
              onUndoWindowClose?.();
              onUndo();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Undo last scan"
          >
            <Ionicons name="arrow-undo" size={16} color={colors.textInverse} />
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  message: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    flex: 1,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  undoText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
