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
import { Ionicons } from '@expo/vector-icons';
import type { MaintenancePriority, CreateMaintenanceInput } from '@rgr/shared';
import { MaintenancePriorityLabels } from '@rgr/shared';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { useCreateMaintenance } from '../../hooks/useMaintenanceData';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

interface CreateMaintenanceModalProps {
  visible: boolean;
  onClose: () => void;
  assetId?: string; // Pre-selected asset (from asset detail page)
  assetNumber?: string; // Display name for pre-selected asset
  // Defect context: pre-fill form when creating from a defect report
  defectReportId?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultPriority?: MaintenancePriority;
  onCreated?: (maintenanceId: string) => void;
  /** When provided, the modal collects form data but delegates creation to this callback.
   *  Used by the atomic accept-defect flow to wrap both operations in a transaction. */
  onExternalSubmit?: (input: CreateMaintenanceInput) => Promise<void>;
}

const PRIORITY_ORDER: MaintenancePriority[] = ['low', 'medium', 'high', 'critical'];

export function CreateMaintenanceModal({
  visible,
  onClose,
  assetId,
  assetNumber,
  defectReportId,
  defaultTitle,
  defaultDescription,
  defaultPriority,
  onCreated,
  onExternalSubmit,
}: CreateMaintenanceModalProps) {
  const { user } = useAuthStore();
  const { mutateAsync: createMaintenanceAsync, isPending } = useCreateMaintenance();
  const guard = useSubmitGuard();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens, pre-filling from defect context if provided
  useEffect(() => {
    if (visible) {
      setTitle(defaultTitle ?? '');
      setDescription(defaultDescription ?? '');
      setPriority(defaultPriority ?? 'medium');
      setDueDate('');
      setNotes('');
      setError(null);
    }
  }, [visible, defaultTitle, defaultDescription, defaultPriority]);

  const handleSubmit = useCallback(() => guard(async () => {
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
    };

    try {
      if (onExternalSubmit) {
        await onExternalSubmit(input);
      } else {
        const record = await createMaintenanceAsync(input);
        if (onCreated) {
          onCreated(record.id);
        }
      }
      if (!onExternalSubmit) {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create maintenance record');
    }
  }), [guard, title, description, priority, dueDate, notes, assetId, user, createMaintenanceAsync, onClose, onCreated, onExternalSubmit]);

  const isLoading = isPending;

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

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerButton} />
            <Text style={styles.headerTitle} numberOfLines={1}>Schedule Maintenance</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Close create maintenance"
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >

            {/* Defect context banner */}
            {defectReportId && (
              <View style={styles.defectBanner}>
                <Ionicons name="warning" size={16} color={colors.warningText} />
                <Text style={styles.defectBannerText}>From Defect Report</Text>
              </View>
            )}

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
                accessibilityLabel="Maintenance title"
              />
            </View>

            {/* Priority */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipContainer}>
                {PRIORITY_ORDER.map((p) => {
                  const isSelected = priority === p;
                  const selectedColor = colors.maintenancePriority[p];
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
              <View style={styles.datePresets}>
                {([
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'Next Week', days: 7 },
                  { label: 'Clear', days: -1 },
                ] as const).map(({ label, days }) => {
                  let presetDate = '';
                  if (days >= 0) {
                    const d = new Date();
                    d.setDate(d.getDate() + days);
                    presetDate = d.toISOString().slice(0, 10);
                  }
                  const isSelected = days >= 0 && dueDate === presetDate;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.datePresetChip, isSelected && styles.datePresetChipActive]}
                      onPress={() => setDueDate(presetDate)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set due date to ${label}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.datePresetText, isSelected && styles.datePresetTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {dueDate ? (
                <Text style={styles.dateDisplay}>
                  {new Date(dueDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </Text>
              ) : null}
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
                accessibilityLabel="Maintenance description"
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
                accessibilityLabel="Maintenance notes"
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttonRow}>
              <Button variant="secondary" onPress={onClose} disabled={isLoading} flex>Cancel</Button>
              <Button isLoading={isLoading} onPress={handleSubmit} flex>Create</Button>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
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
    borderRadius: borderRadius.full,
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
  defectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warningSurface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    marginBottom: spacing.md,
  },
  defectBannerText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.warningText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  datePresetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  datePresetChipActive: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '15',
  },
  datePresetText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  datePresetTextActive: {
    color: colors.electricBlue,
  },
  dateDisplay: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    marginTop: spacing.sm,
  },
});
