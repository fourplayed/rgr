import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AssetCategoryLabels, TrailerSubtypes } from '@rgr/shared';
import type { AssetCategory as AssetCategoryType, CreateAssetInput } from '@rgr/shared';
import { useCreateAsset } from '../../src/hooks/useAdminAssets';
import { useDepots } from '../../src/hooks/useDepots';
import { triggerRegoLookup } from '../../src/utils/regoLookup';
import { CreateAssetOverlay } from '../../src/components/admin/CreateAssetOverlay';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { FilterChip } from '../../src/components/common/FilterChip';
import { Button } from '../../src/components/common/Button';
import { colors } from '../../src/theme/colors';
import {
  spacing,
  fontSize,
  shadows,
  borderRadius,
  fontFamily as fonts,
} from '../../src/theme/spacing';
import { formStyles } from '../../src/theme/formStyles';
import { AppText } from '../../src/components/common';

const CATEGORIES: AssetCategoryType[] = ['trailer', 'dolly'];
const ASSET_NUMBER_REGEX = /^[A-Z]{2}\d{3,}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function CreateAssetScreen() {
  const router = useRouter();
  const createMutation = useCreateAsset();
  const { data: depots = [] } = useDepots();

  const [assetNumber, setAssetNumber] = useState('');
  const [category, setCategory] = useState<AssetCategoryType>('trailer');
  const [subtype, setSubtype] = useState<string | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [vin, setVin] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationExpiry, setRegistrationExpiry] = useState('');
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const assetNumberUpper = assetNumber.trim().toUpperCase();
  const isAssetNumberValid = ASSET_NUMBER_REGEX.test(assetNumberUpper);
  const isRegoValid = registrationNumber.trim().length > 0;
  const isExpiryFormatValid =
    registrationExpiry.trim().length === 0 || DATE_REGEX.test(registrationExpiry.trim());
  const isValid =
    assetNumberUpper.length > 0 && isAssetNumberValid && isRegoValid && isExpiryFormatValid;

  const handleOverlayDismiss = useCallback(() => {
    const wasSuccess = createMutation.isSuccess;
    setShowOverlay(false);
    if (wasSuccess) {
      router.back();
    }
  }, [createMutation.isSuccess, router]);

  const overlayError = useMemo(() => {
    if (createMutation.isError) {
      return createMutation.error?.message ?? 'An unexpected error occurred';
    }
    return null;
  }, [createMutation.isError, createMutation.error]);

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setError(null);
    setShowOverlay(true);

    const input: CreateAssetInput = {
      assetNumber: assetNumberUpper,
      category,
      subtype: category === 'trailer' ? subtype : null,
      make: make.trim() || null,
      model: model.trim() || null,
      yearManufactured: year.trim() ? parseInt(year.trim(), 10) : null,
      vin: vin.trim().toUpperCase() || null,
      registrationNumber: registrationNumber.trim().toUpperCase(),
      registrationExpiry: registrationExpiry.trim() || null,
      assignedDepotId: selectedDepotId,
      description: description.trim() || null,
      notes: notes.trim() || null,
    };

    createMutation.mutate(input, {
      onSuccess: (createdAsset) => {
        if (createdAsset?.id) {
          triggerRegoLookup(createdAsset.id).catch(() => {});
        }
      },
    });
  }, [
    isValid,
    assetNumberUpper,
    category,
    subtype,
    make,
    model,
    year,
    vin,
    registrationNumber,
    registrationExpiry,
    selectedDepotId,
    description,
    notes,
    createMutation,
  ]);

  return (
    <View style={styles.container}>
      <SheetHeader
        icon="add-circle"
        title="Create Asset"
        onClose={() => router.back()}
        closeIcon="arrow-back"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Asset Number */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Asset Number *</AppText>
            <TextInput
              style={formStyles.input}
              value={assetNumber}
              onChangeText={setAssetNumber}
              placeholder="e.g. TL001"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
            {assetNumber.trim().length > 0 && !isAssetNumberValid && (
              <AppText style={styles.hintText}>Format: 2 letters + 3+ digits (e.g. TL001)</AppText>
            )}
          </View>

          {/* Category */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Category *</AppText>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c}
                  label={AssetCategoryLabels[c]}
                  isSelected={category === c}
                  selectedColor={colors.electricBlue}
                  onPress={() => {
                    setCategory(c);
                    if (c === 'dolly') setSubtype(null);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Subtype — only for Trailer */}
          {category === 'trailer' && (
            <View style={formStyles.inputGroup}>
              <AppText style={formStyles.label}>Subtype</AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                <FilterChip
                  label="None"
                  isSelected={!subtype}
                  selectedColor={colors.electricBlue}
                  onPress={() => setSubtype(null)}
                />
                {TrailerSubtypes.map((st) => (
                  <FilterChip
                    key={st}
                    label={st}
                    isSelected={subtype === st}
                    selectedColor={colors.electricBlue}
                    onPress={() => setSubtype(st)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Make */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Make</AppText>
            <TextInput
              style={formStyles.input}
              value={make}
              onChangeText={setMake}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Model */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Model</AppText>
            <TextInput
              style={formStyles.input}
              value={model}
              onChangeText={setModel}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Year */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Year</AppText>
            <TextInput
              style={formStyles.input}
              value={year}
              onChangeText={setYear}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* VIN */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>VIN</AppText>
            <TextInput
              style={formStyles.input}
              value={vin}
              onChangeText={setVin}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={50}
            />
          </View>

          {/* Registration No. */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Registration No. *</AppText>
            <TextInput
              style={formStyles.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="e.g. 1ABC234"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          {/* Registration Expiry */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Registration Expiry</AppText>
            <TextInput
              style={formStyles.input}
              value={registrationExpiry}
              onChangeText={setRegistrationExpiry}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              maxLength={10}
            />
            {registrationExpiry.trim().length > 0 && !isExpiryFormatValid && (
              <AppText style={styles.hintText}>Format: YYYY-MM-DD (e.g. 2026-06-30)</AppText>
            )}
          </View>

          {/* Depot */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Depot</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              <FilterChip
                label="None"
                isSelected={!selectedDepotId}
                selectedColor={colors.electricBlue}
                onPress={() => setSelectedDepotId(null)}
              />
              {depots.map((depot) => (
                <FilterChip
                  key={depot.id}
                  label={depot.code.toUpperCase()}
                  isSelected={selectedDepotId === depot.id}
                  selectedColor={colors.electricBlue}
                  onPress={() => setSelectedDepotId(depot.id)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Description</AppText>
            <TextInput
              style={[formStyles.input, formStyles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Notes */}
          <View style={formStyles.inputGroup}>
            <AppText style={formStyles.label}>Notes</AppText>
            <TextInput
              style={[formStyles.input, formStyles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>

          {error && <AppText style={formStyles.errorText}>{error}</AppText>}

          {/* Buttons */}
          <View style={formStyles.buttonRow}>
            <Button
              variant="secondary"
              onPress={() => router.back()}
              flex
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color={colors.success}
              onPress={handleSubmit}
              flex
              disabled={!isValid}
              isLoading={createMutation.isPending}
              style={styles.submitButton}
            >
              Create Asset
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CreateAssetOverlay
        visible={showOverlay}
        isSuccess={createMutation.isSuccess}
        isError={createMutation.isError}
        error={overlayError}
        onDismiss={handleOverlayDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  hintText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  submitButton: {
    ...shadows.lg,
  },
});
