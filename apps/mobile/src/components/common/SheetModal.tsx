import React, { useRef, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  keyboardAvoiding?: boolean;
  onDismiss?: (() => void) | undefined;
}

/**
 * Standard page-like modal wrapper with blurred backdrop.
 *
 * Renders a slide-up Modal with:
 * - expo-blur backdrop (matches ScanConfirmation)
 * - tap-to-dismiss overlay area
 * - optional KeyboardAvoidingView
 *
 * Children should be the `<View style={styles.sheet}>` containing
 * SheetHeader, scroll content, and SheetFooter.
 */
export function SheetModal({
  visible,
  onClose,
  children,
  keyboardAvoiding = false,
  onDismiss,
}: SheetModalProps) {
  const prevVisibleRef = useRef(visible);

  useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      onDismiss?.();
    }
    prevVisibleRef.current = visible;
  }, [visible, onDismiss]);

  const Wrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
  const wrapperProps = keyboardAvoiding
    ? { behavior: Platform.OS === 'ios' ? ('padding' as const) : ('height' as const) }
    : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      {visible && (
        <>
          <BlurView
            intensity={50}
            tint="dark"
            style={[StyleSheet.absoluteFillObject, styles.blur]}
          />
          <Wrapper style={styles.container} {...wrapperProps}>
            <TouchableOpacity
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
            {children}
          </Wrapper>
        </>
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
});
