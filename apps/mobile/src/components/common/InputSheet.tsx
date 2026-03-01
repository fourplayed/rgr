import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { LoadingDots } from './LoadingDots';

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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={handleCancel}
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

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
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                >
                  <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={submitLabel}
                >
                  {isLoading ? (
                    <LoadingDots color={colors.textInverse} size={8} />
                  ) : (
                    <Text style={styles.submitButtonText}>{submitLabel}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  submitButton: {
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
