import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  keyboardAvoiding?: boolean;
  onDismiss?: (() => void) | undefined;
  /** When true, renders as an absolutely-positioned overlay instead of a native Modal.
   *  Use this when the SheetModal is already inside another Modal to avoid iOS nesting issues. */
  inline?: boolean;
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
  inline = false,
}: SheetModalProps) {
  const Wrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
  const wrapperProps = keyboardAvoiding
    ? { behavior: Platform.OS === 'ios' ? ('padding' as const) : ('height' as const) }
    : {};

  // Inline mode: render as absolutely-positioned overlay (no native Modal nesting)
  if (inline) {
    if (!visible) return null;
    return (
      <View style={[StyleSheet.absoluteFill, styles.inlineRoot]}>
        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
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
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      {visible && (
        <>
          <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
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
  backdrop: {
    backgroundColor: 'rgba(0,0,30,0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  inlineRoot: {
    zIndex: 9999,
  },
});
