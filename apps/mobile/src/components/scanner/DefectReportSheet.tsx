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
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
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
  const sheetBottomPadding = useSheetBottomPadding();
  const [charCount, setCharCount] = useState(0);
  const [wantsPhoto, setWantsPhoto] = useState(false);
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

  const canSubmit = notesRef.current.trim().length > 0;

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
            { paddingTop: spacing.lg, paddingBottom: sheetBottomPadding },
          ]}
          bounces={true}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Notes Input */}
          <View style={styles.inputSection}>
            <AppText style={styles.inputLabel}>Describe the defect</AppText>
            <AppTextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Enter details about the defect, damage, or issue..."
              onChangeText={handleChangeText}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
            />
            <AppText style={styles.charCount}>
              {charCount > 0 ? `${charCount}/2000` : 'Required'}
            </AppText>
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
              <Ionicons name="camera" size={32} color={colors.electricBlue} />
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
          <Animated.View style={{ opacity: submitOpacity, marginTop: spacing.lg }}>
            <Button
              isLoading={isSubmitting}
              onPress={handleSubmit}
              disabled={!canSubmit}
              color={wantsPhoto ? colors.electricBlue : colors.success}
            >
              {wantsPhoto ? 'Capture & Submit' : 'Submit'}
            </Button>
          </Animated.View>
        </BottomSheetScrollView>
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
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Photo Option
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '18',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  photoOptionDescription: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
