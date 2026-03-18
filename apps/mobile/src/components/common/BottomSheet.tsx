import React, { useRef, useEffect, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { GORHOM_SPRING } from '../../theme/animation';
import { BACKDROP_BLUR_INTENSITY, BACKDROP_BLUR_TINT } from '../../theme/backdrop';

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Wrap in keyboard-aware mode for sheets with text inputs */
  keyboardAware?: boolean;
}

/**
 * Standard bottom sheet wrapper using @gorhom/bottom-sheet.
 *
 * - Simple content sheets: dynamic sizing (content determines height)
 * - Backdrop: BlurView on iOS, opaque overlay on Android
 * - Swipe-to-dismiss enabled (simple sheets only — no form data to lose)
 * - Haptic feedback on dismiss
 */
export function BottomSheet({
  visible,
  onDismiss,
  children,
  keyboardAware = false,
}: BottomSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  // Tracks whether present() was ever called during this mount cycle.
  // gorhom v5 can fire onDismiss for never-presented modals during
  // internal provider cleanup — this guard prevents spurious callbacks.
  const wasPresentedRef = useRef(false);

  useEffect(() => {
    if (visible && !isPresentedRef.current) {
      ref.current?.present();
      isPresentedRef.current = true;
      wasPresentedRef.current = true;
    } else if (!visible && isPresentedRef.current) {
      ref.current?.dismiss();
      isPresentedRef.current = false;
    }
  }, [visible]);

  // Cleanup on unmount — prevent orphaned portals
  useEffect(() => {
    const sheetRef = ref.current;
    return () => {
      sheetRef?.dismiss();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    if (!wasPresentedRef.current) {
      // gorhom v5 fires onDismiss during internal provider cleanup for modals
      // that were never present()ed. Skip all callbacks to prevent spurious effects.
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
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
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.hiddenHandle}
      {...(keyboardAware ? KEYBOARD_AWARE_PROPS : EMPTY_OBJ)}
      animationConfigs={GORHOM_SPRING}
    >
      <BottomSheetView>{children}</BottomSheetView>
    </BottomSheetModal>
  );
}

const KEYBOARD_AWARE_PROPS = {
  keyboardBehavior: 'interactive' as const,
  keyboardBlurBehavior: 'restore' as const,
  android_keyboardInputMode: 'adjustResize' as const,
} as const;

const EMPTY_OBJ = {} as const;

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  hiddenHandle: {
    width: 0,
    height: 0,
    opacity: 0,
  },
});
