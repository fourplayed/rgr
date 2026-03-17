import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fontSize, fontFamily as fonts } from '../../theme/spacing';

interface AppSearchInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
}

export const AppSearchInput = forwardRef<TextInput, AppSearchInputProps>(function AppSearchInput(
  { icon, style, placeholderTextColor, ...props },
  ref
) {
  return (
    <>
      {icon && (
        <Ionicons name={icon} size={20} color={placeholderTextColor ?? colors.textSecondary} />
      )}
      <TextInput
        ref={ref}
        style={[inputStyles.input, style]}
        placeholderTextColor={placeholderTextColor ?? colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </>
  );
});

const inputStyles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
});
