import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  type TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { SheetFooter } from '../common/SheetFooter';
import { AppText } from '../common';

interface DefectReportSheetProps {
  visible: boolean;
  isSubmitting: boolean;
  onSubmit: (notes: string, wantsPhoto: boolean) => void;
  onCancel: () => void;
  onExitComplete?: () => void;
  /** When false, hides the "Add Photo of Defect" checkbox. Default true. */
  showPhotoOption?: boolean;
  /** Render without backdrop (parent provides persistent backdrop). */
  noBackdrop?: boolean;
}

function DefectReportSheetComponent({
  visible,
  isSubmitting,
  onSubmit,
  onCancel,
  onExitComplete,
  showPhotoOption = true,
  noBackdrop = false,
}: DefectReportSheetProps) {
  const [charCount, setCharCount] = useState(0);
  const [wantsPhoto, setWantsPhoto] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wasVisibleRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const notesRef = useRef('');

  // Reset state and focus input on fresh open (false→true edge)
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      notesRef.current = '';
      setCharCount(0);
      setWantsPhoto(false);
      inputRef.current?.clear();
      // Delay focus until gorhom spring animation settles (~350ms)
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
      wasVisibleRef.current = visible;
      return () => clearTimeout(timer);
    }
    wasVisibleRef.current = visible;
  }, [visible]);

  const handleChangeText = (text: string) => {
    notesRef.current = text;
    setCharCount(text.length);
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSubmit(notesRef.current.trim(), wantsPhoto);
  };

  const handleCancel = () => {
    notesRef.current = '';
    setCharCount(0);
    setWantsPhoto(false);
    onCancel();
  };

  const canSubmit = charCount > 0;

  // Fade submit button in/out instead of showing it disabled
  const submitOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(submitOpacity, {
      toValue: canSubmit ? 1 : 0.4,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [canSubmit, submitOpacity]);

  return (
    <SheetModal
      visible={visible}
      onClose={handleCancel}
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      preventDismissWhileBusy={isSubmitting}
      keyboardAware
      snapPoint="55%"
    >
      <View style={sheetLayout.containerTall}>
        <SheetHeader
          icon="warning"
          title="Report Defect"
          onClose={handleCancel}
          backgroundColor={colors.defectYellow}
          titleStyle={{
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        />

        <BottomSheetScrollView
          style={sheetLayout.scroll}
          contentContainerStyle={[
            sheetLayout.scrollContent,
            { paddingTop: spacing.lg, paddingBottom: spacing.lg },
          ]}
          bounces={true}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Notes Input */}
          <View style={styles.inputSection}>
            <AppText style={styles.inputLabel}>Describe the defect</AppText>
            <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
              <AppTextInput
                ref={inputRef}
                style={[styles.textInput, isFocused && styles.textInputFocused]}
                placeholder="Enter details about the defect, damage, or issue..."
                onChangeText={handleChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                multiline
                numberOfLines={4}
                maxLength={2000}
                textAlignVertical="top"
              />
            </View>
            {charCount === 0 ? (
              <View style={styles.charCountRequired}>
                <Ionicons name="alert-circle" size={12} color={colors.warning} />
                <AppText style={styles.charCountRequiredText}>Required</AppText>
              </View>
            ) : (
              <AppText style={styles.charCount}>{charCount}/2000</AppText>
            )}
          </View>

          {/* Photo Option (hidden when showPhotoOption is false) */}
          {showPhotoOption && (
            <TouchableOpacity
              style={styles.photoOption}
              onPress={() => setWantsPhoto(!wantsPhoto)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityLabel="Capture Photo"
              accessibilityState={{ checked: wantsPhoto }}
            >
              <LinearGradient
                colors={[colors.electricBlue + '0F', colors.electricBlue + '05']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: borderRadius.sm }]}
              />
              <Ionicons name="camera" size={24} color={colors.electricBlue} />
              <View style={styles.photoOptionText}>
                <AppText style={styles.photoOptionLabel}>Capture Photo</AppText>
                <AppText style={styles.photoOptionDescription}>
                  Capture a photo of the defect to document the issue
                </AppText>
              </View>
              <Ionicons
                name={wantsPhoto ? 'checkbox' : 'square-outline'}
                size={26}
                color={colors.electricBlue}
              />
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>

        <SheetFooter>
          <Animated.View style={{ opacity: submitOpacity }}>
            <Button
              isLoading={isSubmitting}
              onPress={handleSubmit}
              disabled={!canSubmit}
              color={wantsPhoto ? colors.electricBlue : colors.success}
            >
              {wantsPhoto ? 'Capture & Submit' : 'Submit'}
            </Button>
          </Animated.View>
        </SheetFooter>
      </View>
    </SheetModal>
  );
}

export const DefectReportSheet = memo(DefectReportSheetComponent);

const styles = StyleSheet.create({
  // Input Section
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    borderRadius: borderRadius.md,
  },
  inputWrapperFocused: {
    shadowColor: colors.defectYellow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 140,
    maxHeight: 200,
  },
  textInputFocused: {
    borderColor: colors.defectYellow,
    borderWidth: 1.5,
  },
  charCount: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  charCountRequired: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    gap: 4,
    marginTop: spacing.xs,
  },
  charCountRequiredText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.warning,
  },

  // Photo Option
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.electricBlue + '66',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    overflow: 'hidden' as const,
  },
  photoOptionText: {
    flex: 1,
  },
  photoOptionLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoOptionDescription: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
