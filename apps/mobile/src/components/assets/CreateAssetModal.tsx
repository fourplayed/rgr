import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { AppTextInput } from '../common/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import type {
  AssetCategory as AssetCategoryType,
  TrailerSubtype,
  CreateAssetInput,
} from '@rgr/shared';
import { AssetCategory, AssetCategoryLabels, TrailerSubtypes } from '@rgr/shared';
import { Button } from '../common/Button';
import { FilterChip } from '../common/FilterChip';
import { SheetHeader } from '../common/SheetHeader';
import { LoadingDots } from '../common/LoadingDots';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts, shadows } from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useCreateAsset } from '../../hooks/useAdminAssets';
import { useDepots } from '../../hooks/useAssetData';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { triggerRegoLookup } from '../../utils/regoLookup';
import { AppText } from '../common';

interface CreateAssetModalProps {
  visible: boolean;
  onClose: () => void;
  noBackdrop?: boolean;
  onExitComplete?: () => void;
}

const CATEGORY_ORDER: AssetCategoryType[] = [AssetCategory.TRAILER, AssetCategory.DOLLY];

export function CreateAssetModal({
  visible,
  onClose,
  noBackdrop,
  onExitComplete,
}: CreateAssetModalProps) {
  const bottomPadding = useSheetBottomPadding();
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const notesLayoutY = useRef(0);
  const { mutateAsync: createAssetAsync, isPending } = useCreateAsset();
  const guard = useSubmitGuard();
  const { data: depots = [], isLoading: depotsLoading } = useDepots();

  const [assetNumber, setAssetNumber] = useState('');
  const [category, setCategory] = useState<AssetCategoryType>(AssetCategory.TRAILER);
  const [subtype, setSubtype] = useState<TrailerSubtype | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);
  const [selectedDepotName, setSelectedDepotName] = useState<string | null>(null);
  const [showDepotPicker, setShowDepotPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setAssetNumber('');
      setCategory(AssetCategory.TRAILER);
      setSubtype(null);
      setRegistrationNumber('');
      setMake('');
      setModel('');
      setYear('');
      setSelectedDepotId(null);
      setSelectedDepotName(null);
      setShowDepotPicker(false);
      setNotes('');
      setError(null);
    }
  }, [visible]);

  const handleSelectDepot = useCallback((id: string, name: string) => {
    setSelectedDepotId(id);
    setSelectedDepotName(name);
    setShowDepotPicker(false);
  }, []);

  const handleClearDepot = useCallback(() => {
    setSelectedDepotId(null);
    setSelectedDepotName(null);
  }, []);

  const handleCategoryChange = useCallback((cat: AssetCategoryType) => {
    setCategory(cat);
    // Clear subtype when switching away from trailer
    if (cat !== AssetCategory.TRAILER) {
      setSubtype(null);
    }
  }, []);

  const handleSubmit = useCallback(
    () =>
      guard(async () => {
        if (!assetNumber.trim()) {
          setError('Asset number is required');
          return;
        }

        if (!registrationNumber.trim()) {
          setError('Registration number is required');
          return;
        }

        setError(null);

        const input: CreateAssetInput = {
          assetNumber: assetNumber.trim().toUpperCase(),
          category,
          subtype: category === AssetCategory.TRAILER ? subtype : null,
          registrationNumber: registrationNumber.trim().toUpperCase(),
          make: make.trim() || null,
          model: model.trim() || null,
          yearManufactured: year ? parseInt(year, 10) : null,
          assignedDepotId: selectedDepotId || null,
          notes: notes.trim() || null,
        };

        try {
          const created = await createAssetAsync(input);
          // Fire-and-forget DOT registration lookup
          triggerRegoLookup(created.id);
          onClose();
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to create asset');
        }
      }),
    [
      guard,
      assetNumber,
      category,
      subtype,
      registrationNumber,
      make,
      model,
      year,
      selectedDepotId,
      notes,
      createAssetAsync,
      onClose,
    ]
  );

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      keyboardAware
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      preventDismissWhileBusy={isPending}
      snapPoint="92%"
    >
      <View style={sheetLayout.container}>
        <SheetHeader
          icon="add-circle"
          title="Add New Asset"
          onClose={onClose}
          backgroundColor={colors.electricBlue}
        />

        <BottomSheetScrollView
          ref={scrollRef}
          style={sheetLayout.scroll}
          contentContainerStyle={[
            sheetLayout.scrollContent,
            {
              paddingTop: spacing.base,
              paddingBottom: keyboardHeight > 0 ? keyboardHeight : bottomPadding,
            },
          ]}
          bounces={true}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Asset Number */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Asset Number *</AppText>
            <AppTextInput
              style={formStyles.input}
              value={assetNumber}
              onChangeText={setAssetNumber}
              placeholder="e.g., TR-001"
              autoCapitalize="characters"
              maxLength={50}
              accessibilityLabel="Asset number"
            />
          </View>

          {/* Category */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Category *</AppText>
            <View style={styles.chipContainer}>
              {CATEGORY_ORDER.map((cat) => (
                <FilterChip
                  key={cat}
                  label={AssetCategoryLabels[cat]}
                  isSelected={category === cat}
                  onPress={() => handleCategoryChange(cat)}
                  selectedColor={colors.electricBlue}
                />
              ))}
            </View>
          </View>

          {/* Subtype (trailer only) */}
          {category === AssetCategory.TRAILER && (
            <View style={formStyles.inputGroup}>
              <AppText style={formStyles.label}>Subtype</AppText>
              <View style={styles.chipContainer}>
                {TrailerSubtypes.map((st) => (
                  <FilterChip
                    key={st}
                    label={st}
                    isSelected={subtype === st}
                    onPress={() => setSubtype(subtype === st ? null : st)}
                    selectedColor={colors.electricBlue}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Registration Number */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Registration Number *</AppText>
            <AppTextInput
              style={formStyles.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="e.g., 1ABC234"
              autoCapitalize="characters"
              maxLength={20}
              accessibilityLabel="Registration number"
            />
          </View>

          {/* Make / Model (side by side) */}
          <View style={styles.row}>
            <View style={[formStyles.inputGroup, styles.halfField]}>
              <AppText style={formStyles.label}>Make</AppText>
              <AppTextInput
                style={formStyles.input}
                value={make}
                onChangeText={setMake}
                placeholder="e.g., Vawdrey"
                autoCapitalize="words"
                maxLength={100}
                accessibilityLabel="Make"
              />
            </View>
            <View style={[formStyles.inputGroup, styles.halfField]}>
              <AppText style={formStyles.label}>Model</AppText>
              <AppTextInput
                style={formStyles.input}
                value={model}
                onChangeText={setModel}
                placeholder="e.g., VB-S3"
                autoCapitalize="words"
                maxLength={100}
                accessibilityLabel="Model"
              />
            </View>
          </View>

          {/* Year */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Year</AppText>
            <AppTextInput
              style={formStyles.input}
              value={year}
              onChangeText={setYear}
              placeholder="e.g., 2024"
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="Year manufactured"
            />
          </View>

          {/* Depot */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Depot</AppText>
            {selectedDepotId && selectedDepotName ? (
              <View style={styles.depotSelected}>
                <Ionicons name="business" size={20} color={colors.text} />
                <AppText style={styles.depotSelectedText}>{selectedDepotName}</AppText>
                <TouchableOpacity
                  onPress={handleClearDepot}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear depot selection"
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Pressable
                  style={styles.depotPickerField}
                  onPress={() => setShowDepotPicker((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel="Select a depot"
                >
                  <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                  <AppText style={styles.depotPickerPlaceholder}>Tap to select depot</AppText>
                  <Ionicons
                    name={showDepotPicker ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {showDepotPicker && (
                  <View style={styles.depotPickerDropdown}>
                    {depotsLoading ? (
                      <View style={styles.depotPickerLoading}>
                        <LoadingDots color={colors.textSecondary} size={6} />
                      </View>
                    ) : depots.length === 0 ? (
                      <AppText style={styles.depotPickerEmpty}>No depots found</AppText>
                    ) : (
                      depots
                        .filter((d) => d.isActive)
                        .map((depot) => (
                          <TouchableOpacity
                            key={depot.id}
                            style={styles.depotPickerItem}
                            onPress={() => handleSelectDepot(depot.id, depot.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="business" size={16} color={colors.text} />
                            <AppText style={styles.depotPickerItemText}>{depot.name}</AppText>
                            <AppText style={styles.depotPickerItemSub}>{depot.code}</AppText>
                          </TouchableOpacity>
                        ))
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Notes */}
          <View
            style={formStyles.inputGroup}
            onLayout={(e) => {
              notesLayoutY.current = e.nativeEvent.layout.y;
            }}
          >
            <AppText style={formStyles.label}>Notes</AppText>
            <AppTextInput
              style={[formStyles.input, formStyles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this asset"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Notes"
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollTo({
                    y: notesLayoutY.current - 100,
                    animated: true,
                  });
                }, 250);
              }}
            />
          </View>

          {error && <AppText style={formStyles.errorText}>{error}</AppText>}

          <View style={{ marginTop: spacing.md }}>
            <Button
              isLoading={isPending}
              onPress={handleSubmit}
              color={colors.success}
              style={styles.submitButton}
            >
              Create Asset
            </Button>
          </View>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  depotSelected: {
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
  depotSelectedText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  depotPickerField: {
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
  depotPickerPlaceholder: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  depotPickerDropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    maxHeight: 200,
  },
  depotPickerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  depotPickerEmpty: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  depotPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  depotPickerItemText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  depotPickerItemSub: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  submitButton: {
    width: '100%',
    ...shadows.lg,
  },
});
