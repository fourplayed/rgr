import React, { useRef, useEffect, useCallback } from 'react';
import { InteractionManager, Platform, StyleSheet, Dimensions } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { GORHOM_SPRING } from '../../theme/animation';

const MAX_DYNAMIC_HEIGHT = Dimensions.get('window').height;

/** Null handle removes the ~20px handle area above sheet content. */
const NullHandle = () => null;

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Enable keyboard-aware behavior for form sheets */
  keyboardAware?: boolean;
  /** Fires after dismiss animation completes */
  onExitComplete?: (() => void) | undefined;
  /** Disable swipe-to-dismiss when mutations are in-flight */
  preventDismissWhileBusy?: boolean | undefined;
  /** Render without backdrop (parent provides persistent backdrop for chaining) */
  noBackdrop?: boolean | undefined;
  /** Compact sheets use dynamic sizing (content determines height).
   *  Default false = fixed 90% snap for data/form modals.
   *
   *  **Do not use on sheets containing `BottomSheetTextInput`.**
   *  Dynamic sizing + text input creates a layout measurement feedback loop
   *  (each keystroke triggers re-measurement → disrupts native input state). */
  compact?: boolean | undefined;
  /** Fixed snap point override (e.g. '55%'). Ignored when `compact` is true. */
  snapPoint?: string | undefined;
}

/**
 * Sheet modal adapter using @gorhom/bottom-sheet.
 *
 * - Data modals: fixed snap point at 90% (prevents layout jank on async content load)
 * - Form modals: `preventDismissWhileBusy` disables swipe when mutations are pending
 * - `onExitComplete` fires after dismiss animation (wired to gorhom's `onDismiss`)
 * - Re-exports gorhom scrollable components for consumer use
 */
export function SheetModal({
  visible,
  onClose,
  children,
  keyboardAware = false,
  onExitComplete,
  preventDismissWhileBusy = false,
  noBackdrop = false,
  compact = false,
  snapPoint,
}: SheetModalProps) {
  const ref = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  // Track programmatic dismiss so handleDismiss can distinguish it from user swipe/tap.
  const programmaticDismissRef = useRef(false);

  useEffect(() => {
    if (visible && !isPresentedRef.current) {
      // Defer present() by one interaction frame so any overlapping native Modal
      // dismiss (e.g. camera → photo review) completes first on iOS.
      // Safety: if InteractionManager is blocked (e.g. by a lingering animation
      // handle), fall back after 300ms so the sheet is never silently lost.
      let cancelled = false;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const doPresent = () => {
        if (cancelled || isPresentedRef.current) return;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        ref.current?.present();
        isPresentedRef.current = true;
      };

      const handle = InteractionManager.runAfterInteractions(doPresent);
      fallbackTimer = setTimeout(doPresent, 300);

      return () => {
        cancelled = true;
        handle.cancel();
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
      };
    } else if (!visible && isPresentedRef.current) {
      programmaticDismissRef.current = true;
      ref.current?.dismiss();
      isPresentedRef.current = false;
    }
  }, [visible]);

  // Cleanup on unmount — prevent orphaned portals.
  // Mark as programmatic so handleDismiss doesn't call onClose.
  useEffect(() => {
    return () => {
      programmaticDismissRef.current = true;
      ref.current?.dismiss();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    if (programmaticDismissRef.current) {
      // Dismiss was triggered by visible→false — skip onClose (state machine
      // already knows) and only fire the exit-complete signal.
      programmaticDismissRef.current = false;
      onExitComplete?.();
      return;
    }
    // User-initiated dismiss (swipe / backdrop tap)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onExitComplete?.();
  }, [onClose, onExitComplete]);

  const preventDismissRef = useRef(preventDismissWhileBusy);
  preventDismissRef.current = preventDismissWhileBusy;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior={preventDismissRef.current ? 'none' : 'close'}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
        ) : null}
      </BottomSheetBackdrop>
    ),
    [] // stable — reads ref at invocation time
  );

  return (
    <BottomSheetModal
      ref={ref}
      {...(compact
        ? { enableDynamicSizing: true, maxDynamicContentSize: MAX_DYNAMIC_HEIGHT }
        : { snapPoints: snapPoint ? [snapPoint] : SNAP_POINTS, enableDynamicSizing: false })}
      enablePanDownToClose={!preventDismissWhileBusy}
      onDismiss={handleDismiss}
      {...(!noBackdrop ? { backdropComponent: renderBackdrop } : {})}
      backgroundStyle={styles.background}
      handleComponent={NullHandle}
      {...(keyboardAware ? KEYBOARD_AWARE_PROPS : EMPTY_OBJ)}
      animationConfigs={GORHOM_SPRING}
    >
      {children}
    </BottomSheetModal>
  );
}

const SNAP_POINTS = ['90%'];

const KEYBOARD_AWARE_PROPS = {
  keyboardBehavior: 'interactive' as const,
  keyboardBlurBehavior: 'restore' as const,
  android_keyboardInputMode: 'adjustResize' as const,
} as const;

const EMPTY_OBJ = {} as const;

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
});

// Re-export gorhom scrollable components so consumers import from this adapter
export { BottomSheetScrollView, BottomSheetFlatList, BottomSheetTextInput };
