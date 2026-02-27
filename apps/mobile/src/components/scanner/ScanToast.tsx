import React, { useEffect, useRef, useCallback } from 'react';
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

interface ScanToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'info' | 'link' | undefined;
  onUndo?: (() => void) | undefined;
  onDismiss: () => void;
  duration?: number | undefined;
}

export function ScanToast({
  visible,
  message,
  type = 'success',
  onUndo,
  onDismiss,
  duration = 3000,
}: ScanToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      clearTimer();
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration);
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      clearTimer();
    }

    return clearTimer;
  }, [visible, duration, onDismiss, opacity, translateY, clearTimer]);

  if (!visible) return null;

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'link' ? 'link' : 'information-circle';
  const iconColor = type === 'success' ? colors.success : type === 'link' ? colors.electricBlue : colors.info;
  const bgColor = type === 'success' ? colors.success + '20' : type === 'link' ? colors.electricBlue + '20' : colors.info + '20';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={18} color={iconColor} />
        <Text style={[styles.message, { color: iconColor }]} numberOfLines={1}>
          {message}
        </Text>
      </View>
      {onUndo && (
        <TouchableOpacity
          style={styles.undoButton}
          onPress={() => {
            clearTimer();
            onUndo();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  message: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    flex: 1,
  },
  undoButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
  },
  undoText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
