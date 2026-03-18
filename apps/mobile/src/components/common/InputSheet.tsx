import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { colors } from '../../theme/colors';
import {
  spacing,
  fontSize,
  borderRadius,
  lineHeight,
  fontFamily as fonts,
} from '../../theme/spacing';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';
import { SheetHeader } from './SheetHeader';
import { AppText } from './AppText';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';

interface InputSheetProps {
  visible: boolean;
  title: string;
  message: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValue?: string;
}

export function InputSheet({
  visible,
  title,
  message,
  placeholder = '',
  keyboardType = 'default',
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValue = '',
}: InputSheetProps) {
  const [value, setValue] = useState(defaultValue);

  // Reset value when modal opens with new default
  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSubmit(value);
  };

  const sheetBottomPadding = useSheetBottomPadding();

  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  return (
    <BottomSheet visible={visible} onDismiss={handleCancel} keyboardAware>
      <SheetHeader
        icon="create-outline"
        title={title}
        onClose={handleCancel}
        backgroundColor={colors.primary}
      />
      <View style={[styles.content, { paddingBottom: sheetBottomPadding }]}>
        <AppText style={styles.message}>{message}</AppText>

        <AppTextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          keyboardType={keyboardType}
          editable={!isLoading}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            onPress={handleCancel}
            disabled={isLoading}
            flex
            accessibilityLabel={cancelLabel}
          >
            {cancelLabel}
          </Button>

          <Button
            onPress={handleSubmit}
            isLoading={isLoading}
            flex
            accessibilityLabel={submitLabel}
          >
            {submitLabel}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: lineHeight.body,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
