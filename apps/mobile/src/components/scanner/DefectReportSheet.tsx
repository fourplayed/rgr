import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal } from '../common/SheetModal';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';

interface DefectReportSheetProps {
  visible: boolean;
  isSubmitting: boolean;
  onSubmit: (notes: string, wantsPhoto: boolean) => void;
  onCancel: () => void;
  onExitComplete?: () => void;
  /** When false, hides the "Add Photo of Defect" checkbox. Default true. */
  showPhotoOption?: boolean;
}

function DefectReportSheetComponent({
  visible,
  isSubmitting,
  onSubmit,
  onCancel,
  onExitComplete,
  showPhotoOption = true,
}: DefectReportSheetProps) {
  const sheetBottomPadding = useSheetBottomPadding();
  const [notes, setNotes] = useState('');
  const [wantsPhoto, setWantsPhoto] = useState(false);

  // Reset state when modal opens (clean slate for new report)
  useEffect(() => {
    if (visible) {
      setNotes('');
      setWantsPhoto(false);
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit(notes.trim(), wantsPhoto);
  };

  const handleCancel = () => {
    setNotes('');
    setWantsPhoto(false);
    onCancel();
  };

  const canSubmit = notes.trim().length > 0;

  // Fade submit button in/out instead of showing it disabled
  const submitOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(submitOpacity, {
      toValue: canSubmit ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [canSubmit, submitOpacity]);

  return (
    <SheetModal visible={visible} onClose={handleCancel} onExitComplete={onExitComplete} keyboardAware>
      <View style={sheetLayout.container}>
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
            <Text style={styles.inputLabel}>Describe the defect</Text>
            <BottomSheetTextInput
              style={[
                styles.textInput,
                notes ? { fontFamily: fonts.regular } : { fontFamily: fonts.italic },
              ]}
              placeholder="Enter details about the defect, damage, or issue..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>
              {notes.length > 0 ? `${notes.length}/2000` : 'Required'}
            </Text>
          </View>

          {/* Photo Option (hidden when showPhotoOption is false) */}
          {showPhotoOption && (
            <TouchableOpacity
              style={styles.photoOption}
              onPress={() => setWantsPhoto(!wantsPhoto)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityLabel="Capture Photo"
              accessibilityState={{ checked: wantsPhoto }}
            >
              <Ionicons name="camera" size={32} color={colors.electricBlue} />
              <View style={styles.photoOptionText}>
                <Text style={styles.photoOptionLabel}>Capture Photo</Text>
                <Text style={styles.photoOptionDescription}>
                  Capture a photo of the defect to document the issue
                </Text>
              </View>
              <Ionicons
                name={wantsPhoto ? 'radio-button-on' : 'radio-button-off'}
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
    fontFamily: fonts.italic,
    color: colors.text,
    minHeight: 120,
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
