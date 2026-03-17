import React, { forwardRef } from 'react';
import type { TextInput, TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';

/**
 * Drop-in replacement for BottomSheetTextInput with:
 * - Default placeholderTextColor (colors.textSecondary)
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(
  { style, placeholderTextColor, ...props },
  ref
) {
  return (
    <BottomSheetTextInput
      ref={ref as React.ComponentProps<typeof BottomSheetTextInput>['ref']}
      style={style}
      placeholderTextColor={placeholderTextColor ?? colors.textDisabled}
      {...props}
    />
  );
});
