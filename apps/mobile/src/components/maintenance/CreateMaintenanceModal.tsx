import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MaintenancePriority, CreateMaintenanceInput } from '@rgr/shared';
import { MaintenancePriorityLabels } from '@rgr/shared';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { SheetModal } from '../common/SheetModal';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
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
  /** Render inline (no native Modal) — use when already inside a Modal. */
  inline?: boolean;
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
  inline,
}: CreateMaintenanceModalProps) {
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: createMaintenanceAsync, isPending } = useCreateMaintenance();
  const guard = useSubmitGuard();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [dueDate, setDueDate] = useState('');

  // Compute date presets once at mount — dates only matter at open time
  const datePresets = useMemo(() => {
    const addDays = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    return [
      { label: 'Today', date: addDays(0) },
      { label: 'Tomorrow', date: addDays(1) },
      { label: 'Next Week', date: addDays(7) },
      { label: 'Clear', date: '' },
    ];
  }, []);
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

  const handleSubmit = useCallback(
    () =>
      guard(async () => {
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
      }),
    [
      guard,
      title,
      description,
      priority,
      dueDate,
      notes,
      assetId,
      user,
      createMaintenanceAsync,
      onClose,
      onCreated,
      onExternalSubmit,
    ]
  );

  const isLoading = isPending;

  return (
    <SheetModal visible={visible} onClose={onClose} keyboardAvoiding inline={!!inline}>
      <View style={styles.sheet}>
        <SheetHeader
          icon="construct"
          title="Schedule Maintenance"
          onClose={onClose}
          backgroundColor={colors.warning}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          showsVerticalScrollIndicator={false}
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
            <View style={formStyles.inputGroup}>
              <Text style={formStyles.label}>Asset</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{assetNumber}</Text>
              </View>
            </View>
          )}

          {/* Title */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Title *</Text>
            <TextInput
              style={formStyles.input}
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
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Priority</Text>
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
                          fontFamily: isSelected ? fonts.bold : fonts.regular,
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
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Due Date (optional)</Text>
            <View style={styles.datePresets}>
              {datePresets.map(({ label, date }) => {
                const isSelected = date !== '' && dueDate === date;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.datePresetChip, isSelected && styles.datePresetChipActive]}
                    onPress={() => setDueDate(date)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set due date to ${label}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[styles.datePresetText, isSelected && styles.datePresetTextActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {dueDate ? (
              <Text style={styles.dateDisplay}>
                {new Date(dueDate + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Description (optional)</Text>
            <TextInput
              style={[formStyles.input, formStyles.textArea]}
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
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Notes (optional)</Text>
            <TextInput
              style={[formStyles.input, formStyles.textArea]}
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

          {error && <Text style={formStyles.errorText}>{error}</Text>}
        </ScrollView>

        <SheetFooter>
          <View style={formStyles.buttonRow}>
            <Button variant="secondary" onPress={onClose} disabled={isLoading} flex>
              Cancel
            </Button>
            <Button isLoading={isLoading} onPress={handleSubmit} flex>
              Schedule Maintenance
            </Button>
          </View>
        </SheetFooter>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    paddingTop: spacing.base,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  datePresetTextActive: {
    color: colors.electricBlue,
  },
  dateDisplay: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    marginTop: spacing.sm,
  },
});
