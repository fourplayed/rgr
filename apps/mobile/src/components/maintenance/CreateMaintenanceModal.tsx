import React, { useState, useEffect, useCallback } from 'react';
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
import type { MaintenancePriority, CreateMaintenanceInput } from '@rgr/shared';
import { MaintenancePriorityLabels } from '@rgr/shared';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { useCreateMaintenance } from '../../hooks/useMaintenanceData';

interface CreateMaintenanceModalProps {
  visible: boolean;
  onClose: () => void;
  assetId?: string; // Pre-selected asset (from asset detail page)
  assetNumber?: string; // Display name for pre-selected asset
}

const PRIORITY_ORDER: MaintenancePriority[] = ['low', 'medium', 'high', 'critical'];

export function CreateMaintenanceModal({
  visible,
  onClose,
  assetId,
  assetNumber,
}: CreateMaintenanceModalProps) {
  const { user } = useAuthStore();
  const createMutation = useCreateMaintenance();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setNotes('');
      setEstimatedCost('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!assetId) {
      setError('Asset is required');
      return;
    }

    setError(null);

    const input: CreateMaintenanceInput = {
      assetId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: 'scheduled',
      reportedBy: user?.id || null,
      dueDate: dueDate.trim() || null,
      notes: notes.trim() || null,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
    };

    try {
      await createMutation.mutateAsync(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create maintenance record');
    }
  }, [title, description, priority, dueDate, notes, estimatedCost, assetId, user, createMutation, onClose]);

  const isLoading = createMutation.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Schedule Maintenance</Text>

            {/* Asset (read-only if pre-selected) */}
            {assetId && assetNumber && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Asset</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>{assetNumber}</Text>
                </View>
              </View>
            )}

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Brake inspection, Tire replacement"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="sentences"
                maxLength={200}
              />
            </View>

            {/* Priority */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipContainer}>
                {PRIORITY_ORDER.map((p) => {
                  const isSelected = priority === p;
                  const selectedColor = colors.maintenancePriority[p as keyof typeof colors.maintenancePriority];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? selectedColor : colors.surface,
                          borderColor: isSelected ? 'transparent' : colors.border,
                        },
                      ]}
                      onPress={() => setPriority(p)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? colors.textInverse : colors.text,
                            fontFamily: isSelected ? 'Lato_700Bold' : 'Lato_400Regular',
                          },
                        ]}
                      >
                        {MaintenancePriorityLabels[p]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date (optional)</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the maintenance work needed"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Estimated Cost */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estimated Cost (optional)</Text>
              <TextInput
                style={styles.input}
                value={estimatedCost}
                onChangeText={setEstimatedCost}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingDots color={colors.textInverse} size={8} />
                ) : (
                  <Text style={styles.saveButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  scrollView: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  readOnlyField: {
    backgroundColor: colors.chrome,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  readOnlyText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
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
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  saveButton: {
    backgroundColor: '#0000FF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
