import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAssetNumber } from '@rgr/shared';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface DefectReportSheetProps {
  visible: boolean;
  assetNumber: string;
  isSubmitting: boolean;
  onSubmit: (notes: string, wantsPhoto: boolean) => void;
  onCancel: () => void;
  onDismiss?: () => void;
  /** When false, hides the "Add Photo of Defect" checkbox. Default true. */
  showPhotoOption?: boolean;
}

function DefectReportSheetComponent({
  visible,
  assetNumber,
  isSubmitting,
  onSubmit,
  onCancel,
  onDismiss,
  showPhotoOption = true,
}: DefectReportSheetProps) {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
      onDismiss={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleCancel}
        />

        <View style={styles.sheet}>
          <SheetHeader
            icon="warning"
            title="Report Defect"
            onClose={handleCancel}
            backgroundColor="#FACC15"
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Asset info */}
            <Text style={styles.assetInfo}>
              Asset <Text style={styles.assetNumber}>{assetNumber ? formatAssetNumber(assetNumber) : assetNumber}</Text>
            </Text>

            {/* Notes Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Describe the defect</Text>
              <TextInput
                style={styles.textInput}
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
                style={[styles.photoOption, wantsPhoto && styles.photoOptionSelected]}
                onPress={() => setWantsPhoto(!wantsPhoto)}
                activeOpacity={0.7}
              >
                <View style={styles.photoOptionIcon}>
                  <Ionicons
                    name={wantsPhoto ? "camera" : "camera-outline"}
                    size={24}
                    color={wantsPhoto ? colors.electricBlue : colors.textSecondary}
                  />
                </View>
                <View style={styles.photoOptionText}>
                  <Text style={[styles.photoOptionLabel, wantsPhoto && styles.photoOptionLabelSelected]}>
                    Add Photo of Defect
                  </Text>
                  <Text style={styles.photoOptionDescription}>
                    Capture an image to help identify the issue
                  </Text>
                </View>
                <View style={[styles.checkbox, wantsPhoto && styles.checkboxChecked]}>
                  {wantsPhoto && (
                    <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          <SheetFooter>
            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                onPress={handleCancel}
                disabled={isSubmitting}
                flex
              >
                Cancel
              </Button>

              <Button isLoading={isSubmitting} icon="send" onPress={handleSubmit} disabled={!canSubmit} flex>
                Submit Report
              </Button>
            </View>
          </SheetFooter>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const DefectReportSheet = memo(DefectReportSheetComponent);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    paddingTop: spacing.lg,
  },

  // Asset info
  assetInfo: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  assetNumber: {
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },

  // Input Section
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Photo Option
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  photoOptionSelected: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '10',
  },
  photoOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionText: {
    flex: 1,
  },
  photoOptionLabel: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  photoOptionLabelSelected: {
    color: colors.electricBlue,
  },
  photoOptionDescription: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.electricBlue,
    borderColor: colors.electricBlue,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
