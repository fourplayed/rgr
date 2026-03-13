import React, { forwardRef, useState, useCallback } from 'react';
import type { TextInput, TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { fontFamily as fonts } from '../../theme/spacing';

/**
 * Drop-in replacement for BottomSheetTextInput with:
 * - Default placeholderTextColor (colors.textSecondary)
 * - Italic font when the input is empty (makes placeholders appear italic)
 *
 * Controlled inputs derive emptiness from the `value` prop.
 * Uncontrolled inputs track emptiness via `onChangeText`.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(
  { style, value, defaultValue, onChangeText, placeholderTextColor, ...props },
  ref
) {
  const [internalEmpty, setInternalEmpty] = useState(!defaultValue || defaultValue.length === 0);
  const isEmpty = value !== undefined ? value.length === 0 : internalEmpty;

  const handleChangeText = useCallback(
    (text: string) => {
      if (value === undefined) {
        setInternalEmpty(text.length === 0);
      }
      onChangeText?.(text);
    },
    [value, onChangeText]
  );

  return (
    <BottomSheetTextInput
      ref={ref as React.ComponentProps<typeof BottomSheetTextInput>['ref']}
      style={[style, isEmpty && ITALIC_STYLE]}
      value={value}
      defaultValue={defaultValue}
      onChangeText={handleChangeText}
      placeholderTextColor={placeholderTextColor ?? colors.textSecondary}
      {...props}
    />
  );
});

const ITALIC_STYLE = { fontFamily: fonts.italic } as const;
