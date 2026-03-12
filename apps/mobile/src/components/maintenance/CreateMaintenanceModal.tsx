import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { MaintenancePriority, CreateMaintenanceInput } from '@rgr/shared';
import { MaintenancePriorityLabels, formatAssetNumber } from '@rgr/shared';
import { Button } from '../common/Button';
import { FilterChip } from '../common/FilterChip';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal } from '../common/SheetModal';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts, shadows } from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { useAuthStore } from '../../store/authStore';
import { useCreateMaintenance } from '../../hooks/useMaintenanceData';
import { useAssetList } from '../../hooks/useAssetData';
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
  /** Render without backdrop (parent provides persistent backdrop for chaining). */
  noBackdrop?: boolean;
  /** Fires after exit animation completes. */
  onExitComplete?: () => void;
}

const PRIORITY_ORDER: MaintenancePriority[] = ['low', 'medium', 'critical'];

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
  noBackdrop,
  onExitComplete,
}: CreateMaintenanceModalProps) {
  const sheetBottomPadding = useSheetBottomPadding();
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: createMaintenanceAsync, isPending } = useCreateMaintenance();
  const guard = useSubmitGuard();

  const [title, setTitle] = useState('');
  const descriptionRef = useRef('');
  const [formKey, setFormKey] = useState(0);
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [dueDate, setDueDate] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Asset selection state (used when no assetId prop is provided)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetNumber, setSelectedAssetNumber] = useState<string | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const effectiveAssetId = assetId ?? selectedAssetId ?? undefined;

  // Fetch assets for picker (disabled when modal is hidden to avoid unnecessary query observer work)
  const assetSearchFilters = assetSearch
    ? { search: assetSearch, pageSize: 20, enabled: visible }
    : { pageSize: 20, enabled: visible };
  const { data: assetListData, isLoading: assetsLoading } = useAssetList(assetSearchFilters);
  const assetResults = assetListData?.data ?? [];

  const handleSelectAsset = useCallback((id: string, number: string) => {
    setSelectedAssetId(id);
    setSelectedAssetNumber(number);
    setShowAssetPicker(false);
    setAssetSearch('');
  }, []);

  const handleClearAsset = useCallback(() => {
    setSelectedAssetId(null);
    setSelectedAssetNumber(null);
  }, []);

  // Reset form when modal opens, pre-filling from defect context if provided
  useEffect(() => {
    if (visible) {
      setTitle(defaultTitle ?? '');
      descriptionRef.current = defaultDescription ?? '';
      setFormKey(k => k + 1);
      setPriority(defaultPriority ?? 'medium');
      setDueDate('');
      setShowDatePicker(false);
      setError(null);
      setSelectedAssetId(null);
      setSelectedAssetNumber(null);
      setAssetSearch('');
      setShowAssetPicker(false);
    }
  }, [visible, defaultTitle, defaultDescription, defaultPriority]);

  const handleDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate.toISOString().slice(0, 10));
    }
  }, []);

  const handleSubmit = useCallback(
    () =>
      guard(async () => {
        if (!effectiveAssetId) {
          setError('Asset is required');
          return;
        }

        if (!title.trim()) {
          setError('Title is required');
          return;
        }

        if (!dueDate.trim()) {
          setError('Due date is required');
          return;
        }

        setError(null);

        const input: CreateMaintenanceInput = {
          assetId: effectiveAssetId,
          title: title.trim(),
          description: descriptionRef.current.trim() || null,
          priority,
          status: 'scheduled',
          reportedBy: user?.id || null,
          dueDate: dueDate.trim() || null,
          notes: null,
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
      priority,
      dueDate,
      effectiveAssetId,
      user,
      createMaintenanceAsync,
      onClose,
      onCreated,
      onExternalSubmit,
    ]
  );

  const isLoading = isPending;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      keyboardAware
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      preventDismissWhileBusy={isPending}
      snapPoint="75%"
    >
      <View style={sheetLayout.containerTall}>
        <SheetHeader
          icon="construct"
          title="Schedule Maintenance"
          onClose={onClose}
          backgroundColor={colors.warning}
        />

        <BottomSheetScrollView
          style={sheetLayout.scroll}
          contentContainerStyle={[
            sheetLayout.scrollContent,
            { paddingTop: spacing.base, paddingBottom: sheetBottomPadding },
          ]}
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

          {/* Asset selection */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Asset *</Text>
            {assetId && assetNumber ? (
              // Pre-selected (read-only) — from defect accept or asset detail
              <View style={styles.assetSelected}>
                <Ionicons name="cube" size={20} color={colors.text} />
                <Text style={styles.assetSelectedText}>{formatAssetNumber(assetNumber)}</Text>
              </View>
            ) : selectedAssetId && selectedAssetNumber ? (
              // User-selected — show with clear option
              <View style={styles.assetSelected}>
                <Ionicons name="cube" size={20} color={colors.text} />
                <Text style={styles.assetSelectedText}>
                  {formatAssetNumber(selectedAssetNumber)}
                </Text>
                <TouchableOpacity
                  onPress={handleClearAsset}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear asset selection"
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              // No asset — show search picker
              <>
                <Pressable
                  style={styles.assetPickerField}
                  onPress={() => setShowAssetPicker((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel="Select an asset"
                >
                  <Ionicons name="cube-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.assetPickerPlaceholder}>Tap to select asset</Text>
                  <Ionicons
                    name={showAssetPicker ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {showAssetPicker && (
                  <View style={styles.assetPickerDropdown}>
                    <AppTextInput
                      style={styles.assetSearchInput}
                      value={assetSearch}
                      onChangeText={setAssetSearch}
                      placeholder="Search by asset number..."
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {assetsLoading ? (
                      <View style={styles.assetPickerLoading}>
                        <LoadingDots color={colors.textSecondary} size={6} />
                      </View>
                    ) : assetResults.length === 0 ? (
                      <Text style={styles.assetPickerEmpty}>No assets found</Text>
                    ) : (
                      assetResults.map((asset) => (
                        <TouchableOpacity
                          key={asset.id}
                          style={styles.assetPickerItem}
                          onPress={() => handleSelectAsset(asset.id, asset.assetNumber)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="cube" size={16} color={colors.text} />
                          <Text style={styles.assetPickerItemText}>
                            {formatAssetNumber(asset.assetNumber)}
                          </Text>
                          <Text style={styles.assetPickerItemSub}>{asset.category}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Title */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Title *</Text>
            <AppTextInput
              style={formStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Brake inspection, Tire replacement"
              autoCapitalize="sentences"
              maxLength={200}
              accessibilityLabel="Maintenance title"
            />
          </View>

          {/* Priority */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Priority</Text>
            <View style={styles.chipContainer}>
              {PRIORITY_ORDER.map((p) => (
                <FilterChip
                  key={p}
                  label={MaintenancePriorityLabels[p]}
                  isSelected={priority === p}
                  onPress={() => setPriority(p)}
                  selectedColor={colors.maintenancePriority[p]}
                />
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Due Date *</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={dueDate ? new Date(dueDate + 'T00:00:00') : new Date()}
                mode="date"
                display="compact"
                minimumDate={new Date()}
                onChange={handleDateChange}
                accentColor={colors.electricBlue}
                style={{ alignSelf: 'flex-start' }}
              />
            ) : (
              <>
                <Pressable
                  style={styles.dateField}
                  onPress={() => setShowDatePicker((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel="Select due date"
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={dueDate ? colors.text : colors.textSecondary}
                  />
                  <Text style={[styles.dateFieldText, !dueDate && styles.dateFieldPlaceholder]}>
                    {dueDate
                      ? new Date(dueDate + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Tap to select date'}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate ? new Date(dueDate + 'T00:00:00') : new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                    accentColor={colors.electricBlue}
                  />
                )}
              </>
            )}
          </View>

          {/* Description */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Description (optional)</Text>
            <AppTextInput
              key={formKey}
              style={[formStyles.input, formStyles.textArea]}
              defaultValue={descriptionRef.current}
              onChangeText={(text) => { descriptionRef.current = text; }}
              placeholder="Describe the maintenance work needed"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Maintenance description"
            />
          </View>

          {error && <Text style={formStyles.errorText}>{error}</Text>}

          <View style={{ marginTop: spacing.lg }}>
            <Button
              isLoading={isLoading}
              onPress={handleSubmit}
              color={colors.success}
              style={styles.submitButton}
            >
              Create Task
            </Button>
          </View>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  assetSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  assetSelectedText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  assetPickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  assetPickerPlaceholder: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  assetPickerDropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    maxHeight: 200,
  },
  assetSearchInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assetPickerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  assetPickerEmpty: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  assetPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  assetPickerItemText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  assetPickerItemSub: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  dateFieldText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  dateFieldPlaceholder: {
    color: colors.textSecondary,
  },
  submitButton: {
    width: '100%',
    ...shadows.lg,
  },
});
