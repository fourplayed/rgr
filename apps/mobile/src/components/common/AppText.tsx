import React from 'react';
import { Text, type TextProps, StyleSheet } from 'react-native';

/**
 * Drop-in replacement for React Native's <Text> with the app's default font.
 *
 * Use this instead of <Text> in new components. Text.defaultProps is deprecated
 * in React 18.3+ and will be removed in React 19. This component provides the
 * same default font family without relying on defaultProps.
 */
export function AppText({ style, ...props }: TextProps) {
  return <Text style={[styles.default, style]} {...props} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: 'Lato_400Regular',
  },
});
