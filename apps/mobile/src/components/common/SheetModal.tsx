import React, { useRef, useEffect, useCallback } from 'react';
import { InteractionManager, Platform, StyleSheet, Dimensions } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFlatList,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { GORHOM_SPRING } from '../../theme/animation';
import { BACKDROP_BLUR_INTENSITY, BACKDROP_BLUR_TINT } from '../../theme/backdrop';

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
  /** Fixed snap point override (e.g. '55%' or ['50%', '90%']). Ignored when `compact` is true. */
  snapPoint?: string | string[] | undefined;
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
  // Tracks whether present() was ever called during this mount cycle.
  // Unlike isPresentedRef (cleared on dismiss), this stays true so handleDismiss
  // can distinguish legitimate dismisses from gorhom's spurious onDismiss calls
  // for never-presented modals during internal provider cleanup.
  const wasPresentedRef = useRef(false);
  // Track programmatic dismiss so handleDismiss can distinguish it from user swipe/tap.
  const programmaticDismissRef = useRef(false);
  // Guards against double-handling: once a dismiss is handled (by gorhom's onDismiss
  // OR the fallback timer), subsequent calls are no-ops. Reset on next present().
  const dismissHandledRef = useRef(false);
  // Fallback timer for gorhom v5 bug: onDismiss sometimes doesn't fire for
  // dynamically-sized (compact) sheets when content changes mid-dismiss animation.
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref for onExitComplete so the unmount cleanup always has the latest callback.
  // Needed because the cleanup effect has [] deps and would otherwise capture a stale closure.
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

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
        wasPresentedRef.current = true;
        dismissHandledRef.current = false;
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
      if (__DEV__) console.log('[SheetModal] visible→false, triggering programmatic dismiss');
      programmaticDismissRef.current = true;
      ref.current?.dismiss();
      isPresentedRef.current = false;
      // gorhom v5 sometimes fails to fire onDismiss for dynamically-sized sheets
      // when content changes during the dismiss animation (e.g. defectId→null causes
      // content to shrink, triggering a re-layout that disrupts the dismiss callback).
      // Fire handleDismiss ourselves after the animation should have completed.
      dismissFallbackRef.current = setTimeout(() => {
        dismissFallbackRef.current = null;
        if (programmaticDismissRef.current && !dismissHandledRef.current) {
          dismissHandledRef.current = true;
          programmaticDismissRef.current = false;
          onExitCompleteRef.current?.();
        }
      }, 500);
    }
  }, [visible]);

  // Cleanup on unmount — prevent orphaned portals.
  // Mark as programmatic so handleDismiss doesn't call onClose.
  // Also fire onExitComplete if the sheet was presented but dismiss wasn't handled —
  // this covers conditionally-mounted sheets (e.g. PhotoReviewSheet) where React
  // unmounts the component before gorhom can fire its onDismiss callback.
  useEffect(() => {
    return () => {
      if (dismissFallbackRef.current) {
        clearTimeout(dismissFallbackRef.current);
        dismissFallbackRef.current = null;
      }
      if (wasPresentedRef.current && !dismissHandledRef.current) {
        dismissHandledRef.current = true;
        onExitCompleteRef.current?.();
      }
      programmaticDismissRef.current = true;
      ref.current?.dismiss();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (__DEV__) {
      console.log(
        '[SheetModal] handleDismiss — programmatic:',
        programmaticDismissRef.current,
        'wasPresented:',
        wasPresentedRef.current,
        'dismissHandled:',
        dismissHandledRef.current
      );
    }
    // Clear the dismiss fallback — gorhom fired onDismiss normally.
    if (dismissFallbackRef.current) {
      clearTimeout(dismissFallbackRef.current);
      dismissFallbackRef.current = null;
    }
    isPresentedRef.current = false;
    if (!wasPresentedRef.current) {
      // gorhom v5 fires onDismiss during internal provider cleanup for modals
      // that were never present()ed. Skip all callbacks to prevent spurious
      // onExitComplete cascades into useModalTransition.
      programmaticDismissRef.current = false;
      return;
    }
    if (dismissHandledRef.current) {
      // Already handled by fallback timer — skip to prevent double-fire.
      programmaticDismissRef.current = false;
      return;
    }
    dismissHandledRef.current = true;
    if (programmaticDismissRef.current) {
      // Dismiss was triggered by visible→false — skip onClose (state machine
      // already knows) and only fire the exit-complete signal.
      programmaticDismissRef.current = false;
      onExitCompleteRef.current?.();
      return;
    }
    // User-initiated dismiss (swipe / backdrop tap)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onExitCompleteRef.current?.();
  }, [onClose]);

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
          <BlurView
            intensity={BACKDROP_BLUR_INTENSITY}
            tint={BACKDROP_BLUR_TINT}
            style={StyleSheet.absoluteFillObject}
          />
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
        : {
            snapPoints: snapPoint
              ? Array.isArray(snapPoint)
                ? snapPoint
                : [snapPoint]
              : SNAP_POINTS,
            enableDynamicSizing: false,
          })}
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
export { BottomSheetScrollView, BottomSheetFlatList };
