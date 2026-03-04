import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

// ── Types ────────────────────────────────────────────────────────────────────

type ScanActionBarProps =
  | {
      variant: 'driver';
      onPhotoPress: () => void;
      onDonePress: () => void;
      photoCompleted: boolean;
      disabled: boolean;
    }
  | {
      variant: 'mechanic';
      onPhotoPress: () => void;
      onDefectPress: () => void;
      onTaskPress: () => void;
      photoCompleted: boolean;
      defectCompleted: boolean;
      disabled: boolean;
    };

// ── Component ────────────────────────────────────────────────────────────────

function ScanActionBarComponent(props: ScanActionBarProps) {
  // Animated entrance: slide up + fade in
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const { disabled } = props;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {/* Photo button */}
        <ActionButton
          icon={props.photoCompleted ? 'checkmark-circle' : 'camera'}
          label={props.photoCompleted ? 'Photo' : 'Photo'}
          completed={props.photoCompleted}
          onPress={props.onPhotoPress}
          disabled={disabled}
          accessibilityLabel="Take photo"
          accessibilityHint="Double tap to open camera"
        />

        {props.variant === 'mechanic' ? (
          <>
            {/* Defect button */}
            <ActionButton
              icon={props.defectCompleted ? 'checkmark-circle' : 'warning'}
              label="Defect"
              completed={props.defectCompleted}
              onPress={props.onDefectPress}
              disabled={disabled}
              accessibilityLabel="Report defect"
              accessibilityHint="Double tap to report a defect"
            />

            {/* Task button */}
            <ActionButton
              icon="construct"
              label="Task"
              completed={false}
              onPress={props.onTaskPress}
              disabled={disabled}
              accessibilityLabel="Create task"
              accessibilityHint="Double tap to create a maintenance task"
            />
          </>
        ) : (
          /* Done button (driver only) */
          <ActionButton
            icon="checkmark"
            label="Done"
            completed={false}
            onPress={props.onDonePress}
            disabled={disabled}
            variant="primary"
            accessibilityLabel="Done"
            accessibilityHint="Double tap to finish scanning"
          />
        )}
      </View>
    </Animated.View>
  );
}

// ── Action button sub-component ──────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  completed,
  onPress,
  disabled,
  variant = 'default',
  accessibilityLabel,
  accessibilityHint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  completed: boolean;
  onPress: () => void;
  disabled: boolean;
  variant?: 'default' | 'primary';
  accessibilityLabel: string;
  accessibilityHint: string;
}) {
  const iconColor = disabled
    ? colors.textSecondary
    : completed
      ? colors.success
      : variant === 'primary'
        ? colors.textInverse
        : colors.textInverse;

  const labelColor = disabled
    ? colors.textSecondary
    : completed
      ? colors.success
      : colors.textInverse;

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === 'primary' && styles.actionButtonPrimary,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text
        style={[
          styles.actionLabel,
          { color: labelColor },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export const ScanActionBar = React.memo(ScanActionBarComponent);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.overlayCard,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
