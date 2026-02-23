import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

/**
 * AppText - Custom Text wrapper with default font family
 *
 * This component replaces the deprecated Text.defaultProps pattern
 * and ensures consistent Lato font usage across the app.
 *
 * Usage: Replace <Text> with <AppText> for automatic font styling.
 */
export function AppText({ style, ...props }: TextProps) {
  return <Text style={[styles.default, style]} {...props} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: 'Lato_400Regular',
  },
});
