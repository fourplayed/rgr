import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
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

/**
 * Standard bottom sheet wrapper with backdrop dismiss.
 *
 * Modal tiers:
 * - **Simple sheets** (Alert, Confirm, Input, Tutorial, SaveCredentials):
 *   No maxHeight, content determines height. paddingHorizontal: spacing.lg.
 * - **Form sheets** (CreateMaintenance, DepotForm, DefectReport, Settings):
 *   maxHeight: '85%'. paddingHorizontal: spacing.lg.
 * - **Detail sheets** (DefectReportDetail, MaintenanceDetail):
 *   maxHeight: '90%'. paddingHorizontal: spacing.base (denser content).
 */
export function BottomSheet({
  visible,
  onDismiss,
  children,
  maxHeight,
  style,
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {visible && (
        <>
          <BlurView
            intensity={50}
            tint="dark"
            style={[StyleSheet.absoluteFillObject, styles.blur]}
          />
          <View style={styles.backdrop}>
            <TouchableOpacity
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />

            <View style={[styles.sheet, maxHeight != null && { maxHeight }, style]}>
              <View style={styles.handle} />
              {children}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  blur: {
    backgroundColor: 'rgba(0,0,30,0.3)',
  },
  backdrop: {
    flex: 1,
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
