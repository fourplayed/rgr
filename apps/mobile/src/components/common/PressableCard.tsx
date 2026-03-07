import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, type ViewStyle, type StyleProp } from 'react-native';

interface PressableCardProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Animated press wrapper for card-style touchable elements.
 * Applies a spring scale (0.97) on press for tactile feedback.
 */
export function PressableCard({
  onPress,
  children,
  style,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
}: PressableCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
