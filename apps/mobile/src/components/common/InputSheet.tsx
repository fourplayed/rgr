import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
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
  const inputRef = useRef<TextInput>(null);

  // Reset value when modal opens with new default
  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
      // Focus input after modal animation completes
      const timerId = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timerId);
    }
  }, [visible, defaultValue]);

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSubmit(value);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  return (
    <BottomSheet visible={visible} onDismiss={handleCancel} keyboardAware>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
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
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
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
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
