import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useConsoleStore } from '../../store/consoleStore';
import { colors } from '../../theme/colors';
import { borderRadius, fontSize, fontFamily as fonts, spacing } from '../../theme/spacing';
import { AppText } from '../common';

const BUTTON_SIZE = 40;
const DRAG_THRESHOLD = 10;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export function ConsoleButton() {
  const insets = useSafeAreaInsets();
  const toggleOpen = useConsoleStore((s) => s.toggleOpen);
  const setButtonY = useConsoleStore((s) => s.setButtonY);
  const isOpen = useConsoleStore((s) => s.isOpen);
  const unreadCount = useConsoleStore((s) => s.unreadCount);

  // Start positioned bottom-right, above the tab bar (~90px from bottom)
  const initialTop = SCREEN_HEIGHT - 90 - BUTTON_SIZE;
  const pan = useRef(new Animated.Value(initialTop)).current;
  const currentTop = useRef(initialTop);
  const isDragging = useRef(false);

  // Seed initial position into store
  useEffect(() => {
    setButtonY(initialTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitPosition = (y: number) => {
    currentTop.current = y;
    pan.setValue(y);
    setButtonY(y);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > DRAG_THRESHOLD,

      onPanResponderGrant: () => {
        isDragging.current = false;
      },

      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dy) > DRAG_THRESHOLD) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          const minTop = insets.top + spacing.sm;
          const maxTop = SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - spacing.sm;
          const nextTop = Math.max(minTop, Math.min(maxTop, currentTop.current + gesture.dy));
          pan.setValue(nextTop);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        if (isDragging.current) {
          const minTop = insets.top + spacing.sm;
          const maxTop = SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - spacing.sm;
          const clamped = Math.max(minTop, Math.min(maxTop, currentTop.current + gesture.dy));
          commitPosition(clamped);
        } else {
          // It was a tap
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleOpen();
        }
      },
    })
  ).current;

  const iconColor = isOpen ? colors.navy : colors.electricBlue;
  const useBlur = Platform.OS === 'ios';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.button,
        {
          right: insets.right + spacing.base,
          top: pan,
        },
        isOpen && styles.buttonOpen,
      ]}
    >
      {/* Frosted glass background on iOS, solid fallback on Android */}
      {useBlur && !isOpen ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}

      <Ionicons name="terminal-outline" size={20} color={iconColor} />

      {/* Unread badge */}
      {!isOpen && unreadCount > 0 && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</AppText>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    zIndex: 1001,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 30, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.30)',
  },
  buttonOpen: {
    backgroundColor: colors.electricBlue,
    borderColor: colors.electricBlue,
  },
  badge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    minWidth: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: fontSize.xxs,
    fontFamily: fonts.bold,
  },
});
