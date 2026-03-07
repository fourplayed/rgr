import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { SHEET_SPRING, SHEET_EXIT, BACKDROP_IN, BACKDROP_OUT } from '../../theme/animation';

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Wrap content in KeyboardAvoidingView */
  keyboardAware?: boolean | undefined;
  /** @deprecated Use onExitComplete instead */
  onDismiss?: (() => void) | undefined;
  /** When false, skip backdrop render + animation (ModalShell provides it). Default true. */
  backdrop?: boolean | undefined;
  /** Fires after exit animation completes */
  onExitComplete?: (() => void) | undefined;
  /** Render as absolute overlay instead of native Modal (for use inside ModalShell). */
  inline?: boolean | undefined;
}

export function SheetModal({
  visible,
  onClose,
  children,
  keyboardAware = false,
  onDismiss,
  backdrop = true,
  onExitComplete,
  inline = false,
}: SheetModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const wasVisible = useRef(false);
  const exitAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const Wrapper = keyboardAware ? KeyboardAvoidingView : View;
  const wrapperProps = keyboardAware
    ? { behavior: Platform.OS === 'ios' ? ('padding' as const) : ('height' as const) }
    : {};

  // Entrance animation
  useEffect(() => {
    if (visible) {
      // Cancel any in-flight exit
      exitAnimRef.current?.stop();
      exitAnimRef.current = null;

      wasVisible.current = true;
      setMounted(true);
      translateY.setValue(screenHeight);
      backdropOpacity.setValue(0);

      const anims: Animated.CompositeAnimation[] = [
        Animated.spring(translateY, { toValue: 0, ...SHEET_SPRING }),
      ];
      if (backdrop) {
        anims.push(Animated.timing(backdropOpacity, { toValue: 1, ...BACKDROP_IN }));
      }
      Animated.parallel(anims).start();
    }
  }, [visible, screenHeight, translateY, backdropOpacity, backdrop]);

  // Exit animation (triggered by visible going true→false)
  const runExit = useCallback(() => {
    if (!wasVisible.current) return;
    wasVisible.current = false;

    const anims: Animated.CompositeAnimation[] = [
      Animated.timing(translateY, { toValue: screenHeight, ...SHEET_EXIT }),
    ];
    if (backdrop) {
      anims.push(Animated.timing(backdropOpacity, { toValue: 0, ...BACKDROP_OUT }));
    }
    const anim = Animated.parallel(anims);
    exitAnimRef.current = anim;
    anim.start(({ finished }) => {
      exitAnimRef.current = null;
      if (finished) {
        setMounted(false);
        onExitComplete?.();
        onDismiss?.();
      }
    });
  }, [screenHeight, translateY, backdropOpacity, backdrop, onExitComplete, onDismiss]);

  useEffect(() => {
    if (!visible && wasVisible.current) {
      runExit();
    }
  }, [visible, runExit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      exitAnimRef.current?.stop();
      exitAnimRef.current = null;
    };
  }, []);

  const sheetContent = (
    <Animated.View
      style={[styles.sheetWrapper, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      {children}
    </Animated.View>
  );

  // Inline mode: absolute overlay (no native Modal)
  if (inline) {
    if (!mounted && !visible) return null;
    return (
      <View style={[StyleSheet.absoluteFill, styles.inlineRoot]} pointerEvents="box-none">
        {backdrop && (
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
          </Animated.View>
        )}
        <Wrapper style={styles.container} {...wrapperProps}>
          {(backdrop || !inline) && (
            <TouchableOpacity
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
          )}
          {sheetContent}
        </Wrapper>
      </View>
    );
  }

  // Standard mode: native Modal with deferred unmount
  return (
    <Modal
      visible={mounted || visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {(mounted || visible) && (
        <SafeAreaProvider>
          {backdrop && (
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.blur, { opacity: backdropOpacity }]}
            >
              <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
            </Animated.View>
          )}
          <Wrapper style={styles.container} {...wrapperProps}>
            <TouchableOpacity
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
            {sheetContent}
          </Wrapper>
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  blur: {
    backgroundColor: 'rgba(0,0,30,0.3)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetWrapper: {
    // Allows the sheet children to define their own background/border-radius
  },
  inlineRoot: {
    zIndex: 9999,
  },
});
