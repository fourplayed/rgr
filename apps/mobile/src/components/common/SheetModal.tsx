import React, { useRef, useEffect, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
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
}: SheetModalProps) {
  const ref = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);

  useEffect(() => {
    if (visible && !isPresentedRef.current) {
      ref.current?.present();
      isPresentedRef.current = true;
    } else if (!visible && isPresentedRef.current) {
      ref.current?.dismiss();
      isPresentedRef.current = false;
    }
  }, [visible]);

  // Cleanup on unmount — prevent orphaned portals
  useEffect(() => {
    return () => {
      ref.current?.dismiss();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
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
      snapPoints={SNAP_POINTS}
      enablePanDownToClose={!preventDismissWhileBusy}
      onDismiss={handleDismiss}
      {...(!noBackdrop ? { backdropComponent: renderBackdrop } : {})}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
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
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
  },
});

// Re-export gorhom scrollable components so consumers import from this adapter
export { BottomSheetScrollView, BottomSheetFlatList, BottomSheetTextInput };
