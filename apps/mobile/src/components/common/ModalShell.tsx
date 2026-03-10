import React, { useRef, useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { BACKDROP_IN, BACKDROP_OUT } from '../../theme/animation';

interface ModalShellProps {
  /** True when any child modal should be visible */
  visible: boolean;
  /** Called on backdrop tap or Android back */
  onClose: () => void;
  children: React.ReactNode;
  /** Keep the shell mounted during A→B transitions (backdrop stays visible) */
  keepMounted?: boolean;
}

/**
 * Provides a single shared blur backdrop for modal chaining screens.
 * Child SheetModals should use `inline backdrop={false}` to delegate
 * backdrop rendering to this shell.
 */
export function ModalShell({ visible, onClose, children, keepMounted = false }: ModalShellProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const wasVisible = useRef(false);
  const generationRef = useRef(0);

  // Single effect handles both fade-in and fade-out, using a generation
  // counter to discard stale animation callbacks on rapid toggling.
  useEffect(() => {
    const gen = ++generationRef.current;
    if (visible) {
      wasVisible.current = true;
      setMounted(true);
      backdropOpacity.setValue(0);
      Animated.timing(backdropOpacity, { toValue: 1, ...BACKDROP_IN }).start();
    } else if (!keepMounted && wasVisible.current) {
      wasVisible.current = false;
      Animated.timing(backdropOpacity, { toValue: 0, ...BACKDROP_OUT }).start(({ finished }) => {
        if (finished && gen === generationRef.current) {
          setMounted(false);
        }
      });
    }
  }, [visible, keepMounted, backdropOpacity]);

  const shouldRender = mounted || visible || keepMounted;
  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.blur, { opacity: backdropOpacity }]}
        >
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        <View style={StyleSheet.absoluteFill} pointerEvents={keepMounted ? 'none' : 'auto'}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </View>
        {children}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blur: {
    backgroundColor: 'rgba(0,0,30,0.3)',
  },
});
