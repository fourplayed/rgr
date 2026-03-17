import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, Animated } from 'react-native';
import { AppTextInput } from '../common/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerField } from '../common/DatePickerField';
import type { MaintenancePriority, CreateMaintenanceInput } from '@rgr/shared';
import { MaintenancePriorityLabels, formatAssetNumber } from '@rgr/shared';
import { onlineManager } from '@tanstack/react-query';
import { enqueueMutation } from '../../utils/offlineMutationQueue';
import { logger } from '../../utils/logger';
import { Button } from '../common/Button';
import { FilterChip } from '../common/FilterChip';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
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
import { AppText } from '../common';
import { useSheetEntrance } from '../../hooks/useSheetEntrance';

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
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: createMaintenanceAsync, isPending } = useCreateMaintenance();
  const guard = useSubmitGuard();

  const [title, setTitle] = useState('');
  const descriptionRef = useRef('');
  const [formKey, setFormKey] = useState(0);
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [dueDate, setDueDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally recompute `today` when modal becomes visible so the calendar always shows the current date
  const today = useMemo(() => new Date(), [visible]);

  // Asset selection state (used when no assetId prop is provided)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetNumber, setSelectedAssetNumber] = useState<string | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const entranceStyle = useSheetEntrance(visible);
  const bottomPadding = useSheetBottomPadding();

  // Chevron rotation animation for asset picker toggle
  const chevronRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: showAssetPicker ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showAssetPicker, chevronRotation]);
  const chevronRotate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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
      setFormKey((k) => k + 1);
      setPriority(defaultPriority ?? 'medium');
      setDueDate('');
      setError(null);
      setCalendarExpanded(false);
      setSelectedAssetId(null);
      setSelectedAssetNumber(null);
      setAssetSearch('');
      setShowAssetPicker(false);
    }
  }, [visible, defaultTitle, defaultDescription, defaultPriority]);

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
          // If offline and this is a direct creation (not delegated), queue for later replay
          if (!onlineManager.isOnline() && !onExternalSubmit) {
            try {
              await enqueueMutation({
                type: 'maintenance',
                payload: input as unknown as Record<string, unknown>,
              });
              onClose();
              return;
            } catch (queueError: unknown) {
              logger.warn('Failed to enqueue offline maintenance record:', queueError);
            }
          }
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
      snapPoint={calendarExpanded ? '95%' : '80%'}
    >
      <View style={sheetLayout.container}>
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
            { paddingTop: spacing.base, paddingBottom: bottomPadding },
          ]}
          bounces={true}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={entranceStyle}>
            {/* Asset ID + defect context (when pre-selected) */}
            {assetId && assetNumber ? (
              <View style={styles.assetHeaderRow}>
                <View style={styles.assetInline}>
                  <Ionicons name="cube" size={22} color={colors.text} />
                  <AppText style={styles.assetIdText}>{formatAssetNumber(assetNumber)}</AppText>
                </View>
                {defectReportId && (
                  <View style={styles.defectBannerInline}>
                    <Ionicons name="warning" size={16} color={colors.warningText} />
                    <AppText style={styles.defectBannerText}>Linked to Defect Report</AppText>
                  </View>
                )}
              </View>
            ) : null}

            {/* Asset selection (only when no pre-selected asset) */}
            {!assetId && !assetNumber && (
              <View style={[formStyles.inputGroup, styles.inputGroupWide]}>
                <AppText style={formStyles.label}>Asset *</AppText>
                {selectedAssetId && selectedAssetNumber ? (
                  // User-selected — show with clear option
                  <View style={styles.assetSelected}>
                    <Ionicons name="cube" size={20} color={colors.text} />
                    <AppText style={styles.assetSelectedText}>
                      {formatAssetNumber(selectedAssetNumber)}
                    </AppText>
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
                      <AppText style={styles.assetPickerPlaceholder}>Tap to select asset</AppText>
                      <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                      </Animated.View>
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
                          <AppText style={styles.assetPickerEmpty}>No assets found</AppText>
                        ) : (
                          assetResults.map((asset) => (
                            <TouchableOpacity
                              key={asset.id}
                              style={styles.assetPickerItem}
                              onPress={() => handleSelectAsset(asset.id, asset.assetNumber)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="cube" size={16} color={colors.text} />
                              <AppText style={styles.assetPickerItemText}>
                                {formatAssetNumber(asset.assetNumber)}
                              </AppText>
                              <AppText style={styles.assetPickerItemSub}>{asset.category}</AppText>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Title */}
            <View style={[formStyles.inputGroup, styles.inputGroupWide]}>
              <View style={styles.labelRow}>
                <AppText style={formStyles.label}>Title</AppText>
                {!title.trim() && (
                  <View style={styles.requiredBadge}>
                    <Ionicons name="alert-circle" size={12} color={colors.warning} />
                    <AppText style={styles.requiredText}>Required</AppText>
                  </View>
                )}
              </View>
              <AppTextInput
                style={[
                  formStyles.input,
                  styles.inputElevated,
                  titleFocused && styles.inputFocused,
                ]}
                value={title}
                onChangeText={setTitle}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                placeholder="e.g., Brake inspection, Tire replacement"
                autoCapitalize="sentences"
                maxLength={200}
                accessibilityLabel="Maintenance title"
              />
            </View>

            {/* Due Date */}
            <View style={[formStyles.inputGroup, styles.inputGroupWide]}>
              <View style={styles.labelRow}>
                <AppText style={formStyles.label}>Due Date</AppText>
                {!dueDate.trim() && (
                  <View style={styles.requiredBadge}>
                    <Ionicons name="alert-circle" size={12} color={colors.warning} />
                    <AppText style={styles.requiredText}>Required</AppText>
                  </View>
                )}
              </View>
              <DatePickerField
                value={dueDate}
                onChange={setDueDate}
                minimumDate={today}
                onExpandedChange={setCalendarExpanded}
              />
            </View>

            {/* Priority */}
            <View style={[formStyles.inputGroup, styles.inputGroupWide]}>
              <AppText style={formStyles.label}>Priority</AppText>
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

            {/* Description */}
            <View style={[formStyles.inputGroup, styles.inputGroupWide]}>
              <AppText style={formStyles.label}>Description</AppText>
              <AppTextInput
                key={formKey}
                style={[
                  formStyles.input,
                  formStyles.textArea,
                  styles.inputElevated,
                  { minHeight: 120 },
                  descFocused && styles.inputFocused,
                ]}
                defaultValue={descriptionRef.current}
                onChangeText={(text) => {
                  descriptionRef.current = text;
                }}
                onFocus={() => setDescFocused(true)}
                onBlur={() => setDescFocused(false)}
                placeholder="Describe the maintenance work needed"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Maintenance description"
              />
            </View>

            {error && <AppText style={formStyles.errorText}>{error}</AppText>}

            <View style={{ marginTop: spacing.lg }}>
              <Button
                isLoading={isLoading}
                onPress={handleSubmit}
                disabled={!effectiveAssetId || !title.trim() || !dueDate.trim()}
                color={colors.success}
                style={styles.submitButton}
              >
                Create Task
              </Button>
            </View>
          </Animated.View>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requiredText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.warning,
  },
  inputElevated: {
    backgroundColor: colors.background,
    shadowColor: '#000030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  inputFocused: {
    borderColor: colors.warning,
    borderWidth: 1.5,
    shadowColor: colors.warning,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  inputGroupWide: {
    marginBottom: spacing.base,
  },
  assetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  defectBannerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.defectYellow + '1A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  assetInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assetIdText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  assetSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    shadowColor: '#000030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    shadowColor: '#000030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
    shadowColor: '#000030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    marginBottom: spacing.md,
  },
  defectBannerText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.warningText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submitButton: {
    width: '100%',
    ...shadows.lg,
  },
});
