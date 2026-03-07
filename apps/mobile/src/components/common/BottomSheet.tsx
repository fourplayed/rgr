import React, { useRef, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Dimensions,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Maximum height as percentage string (e.g. '85%') or number */
  maxHeight?: ViewStyle['maxHeight'];
  /** Additional styles for the sheet container */
  style?: StyleProp<ViewStyle>;
  /** Wrap in KeyboardAvoidingView for sheets with text inputs */
  keyboardAware?: boolean;
}

/**
 * Standard bottom sheet wrapper with backdrop dismiss and spring entrance.
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
  keyboardAware = false,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const entranceAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      const anim = Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]);
      entranceAnimRef.current = anim;
      anim.start(() => {
        entranceAnimRef.current = null;
      });
    }

    return () => {
      entranceAnimRef.current?.stop();
      entranceAnimRef.current = null;
    };
  }, [visible, translateY, backdropOpacity]);

  const handleDismiss = () => {
    entranceAnimRef.current?.stop();
    entranceAnimRef.current = null;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const content = (
    <View style={styles.backdrop}>
      <TouchableOpacity
        style={styles.backdropTouchable}
        activeOpacity={1}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />

      <Animated.View
        style={[
          styles.sheet,
          maxHeight != null && { maxHeight },
          style,
          { transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {visible && (
        <>
          <Animated.View style={[StyleSheet.absoluteFillObject, styles.blur, { opacity: backdropOpacity }]}>
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          {keyboardAware ? (
            <KeyboardAvoidingView
              style={styles.keyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {content}
            </KeyboardAvoidingView>
          ) : (
            content
          )}
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
