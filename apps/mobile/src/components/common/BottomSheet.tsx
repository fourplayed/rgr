import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Maximum height as percentage string (e.g. '85%') or number */
  maxHeight?: ViewStyle['maxHeight'];
  /** Additional styles for the sheet container */
  style?: StyleProp<ViewStyle>;
}

export function BottomSheet({
  visible,
  onDismiss,
  children,
  maxHeight,
  style,
}: BottomSheetProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <View style={[styles.sheet, maxHeight != null && { maxHeight }, style]}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
