import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconCircleProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  /** Circle diameter — defaults to 80 */
  size?: number;
}

export function IconCircle({ icon, color, size = 80 }: IconCircleProps) {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '20',
        },
      ]}
    >
      <Ionicons name={icon} size={size * 0.6} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
