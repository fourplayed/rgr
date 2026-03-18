import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  type TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { AppText } from '../common';
import { useSheetEntrance } from '../../hooks/useSheetEntrance';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const wasVisibleRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const notesRef = useRef('');
  const entranceStyle = useSheetEntrance(visible);
  const bottomPadding = useSheetBottomPadding();

  // Track keyboard visibility for snap point (not input focus — avoids
  // shrinking the sheet when tapping the photo checkbox while keyboard is up)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset state on fresh open (false→true edge)
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      notesRef.current = '';
      setCharCount(0);
      setWantsPhoto(false);
      inputRef.current?.clear();
      wasVisibleRef.current = visible;
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
      snapPoint={['57%', '92%']}
      snapIndex={keyboardVisible ? 1 : 0}
    >
      <View style={sheetLayout.containerCompact}>
        <SheetHeader
          icon="warning"
          title="Report Defect"
          onClose={handleCancel}
          backgroundColor={colors.defectYellow}
        />

        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: bottomPadding,
          }}
        >
          <Animated.View style={entranceStyle}>
            {/* Notes Input */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <AppText style={styles.inputLabel}>Defect Description</AppText>
                {charCount === 0 ? (
                  <View style={styles.requiredBadge}>
                    <Ionicons name="alert-circle" size={12} color={colors.warning} />
                    <AppText style={styles.requiredText}>Required</AppText>
                  </View>
                ) : (
                  <AppText style={styles.charCount}>{charCount}/2000</AppText>
                )}
              </View>
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
            </View>

            {/* Actions */}
            {showPhotoOption && <AppText style={styles.actionsLabel}>Actions</AppText>}
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
                  colors={[colors.electricBlue + '1A', colors.electricBlue + '0A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: borderRadius.md }]}
                />
                <Ionicons name="camera" size={24} color={colors.electricBlue} />
                <View style={styles.photoOptionText}>
                  <AppText style={styles.photoOptionLabel}>Capture Photo</AppText>
                  <AppText style={styles.photoOptionDescription}>
                    Include a photo of the defect
                  </AppText>
                </View>
                <Ionicons
                  name={wantsPhoto ? 'checkmark-circle' : 'radio-button-off'}
                  size={24}
                  color={colors.electricBlue}
                />
              </TouchableOpacity>
            )}
          </Animated.View>

          <View style={{ marginTop: spacing.lg }}>
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
          </View>
        </View>
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
    letterSpacing: 1,
  },
  inputWrapper: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.chrome,
  },
  inputWrapperFocused: {
    borderColor: colors.defectYellow,
    borderWidth: 1.5,
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
    minHeight: 100,
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
  },
  labelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  requiredBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  requiredText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.warning,
  },
  actionsLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.base,
    marginBottom: spacing.md,
  },

  // Photo Option
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.electricBlue + '66',
    backgroundColor: colors.chrome,
    borderRadius: borderRadius.md,
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
    letterSpacing: 1,
  },
  photoOptionDescription: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
