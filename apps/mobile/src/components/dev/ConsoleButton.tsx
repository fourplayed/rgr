import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useConsoleStore } from '../../store/consoleStore';
import { colors } from '../../theme/colors';

const BUTTON_SIZE = 44;
const DRAG_THRESHOLD = 10;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export function ConsoleButton() {
  const insets = useSafeAreaInsets();
  const toggleOpen = useConsoleStore((s) => s.toggleOpen);
  const setButtonY = useConsoleStore((s) => s.setButtonY);
  const isOpen = useConsoleStore((s) => s.isOpen);
  const unreadCount = useConsoleStore((s) => s.unreadCount);

  // Start vertically centered
  const initialTop = (SCREEN_HEIGHT - BUTTON_SIZE) / 2;
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
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > DRAG_THRESHOLD,

      onPanResponderGrant: () => {
        isDragging.current = false;
      },

      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dy) > DRAG_THRESHOLD) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          const minTop = insets.top + 8;
          const maxTop = SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - 8;
          const nextTop = Math.max(minTop, Math.min(maxTop, currentTop.current + gesture.dy));
          pan.setValue(nextTop);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        if (isDragging.current) {
          const minTop = insets.top + 8;
          const maxTop = SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - 8;
          const clamped = Math.max(minTop, Math.min(maxTop, currentTop.current + gesture.dy));
          commitPosition(clamped);
        } else {
          // It was a tap
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleOpen();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.button,
        {
          left: insets.left + 8,
          top: pan,
        },
        isOpen && styles.buttonOpen,
      ]}
    >
      <Ionicons
        name="terminal-outline"
        size={22}
        color={isOpen ? '#000030' : colors.devConsole}
      />

      {/* Unread badge */}
      {!isOpen && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
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
    backgroundColor: 'rgba(0, 0, 30, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.devConsole,
  },
  buttonOpen: {
    backgroundColor: colors.devConsole,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Lato_700Bold',
  },
});
