import React, { useRef, useEffect, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';

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
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
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
      handleIndicatorStyle={styles.handle}
      {...(keyboardAware ? {
        keyboardBehavior: 'interactive' as const,
        keyboardBlurBehavior: 'restore' as const,
        android_keyboardInputMode: 'adjustResize' as const,
      } : {})}
      animationConfigs={{
        damping: 18,
        stiffness: 65,
      }}
    >
      {children}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.background,
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
