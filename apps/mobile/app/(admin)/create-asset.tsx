import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  AssetCategoryLabels,
  TrailerSubtypes,
} from '@rgr/shared';
import type { AssetCategory as AssetCategoryType, CreateAssetInput } from '@rgr/shared';
import { useCreateAsset } from '../../src/hooks/useAdminAssets';
import { useDepots } from '../../src/hooks/useDepots';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { CreateAssetOverlay } from '../../src/components/admin/CreateAssetOverlay';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../src/theme/spacing';

const CATEGORIES: AssetCategoryType[] = ['trailer', 'dolly'];
const ASSET_NUMBER_REGEX = /^[A-Z]{2}\d{3,}$/;

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
  const isValid = assetNumberUpper.length > 0 && isAssetNumberValid;

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
      registrationNumber: registrationNumber.trim().toUpperCase() || null,
      registrationExpiry: registrationExpiry.trim() || null,
      assignedDepotId: selectedDepotId,
      description: description.trim() || null,
      notes: notes.trim() || null,
    };

    createMutation.mutate(input, {});
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
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Asset</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              {/* Asset Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Asset Number *</Text>
                <TextInput
                  style={styles.input}
                  value={assetNumber}
                  onChangeText={setAssetNumber}
                  placeholder="e.g. TL001"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                />
                {assetNumber.trim().length > 0 && !isAssetNumberValid && (
                  <Text style={styles.hintText}>
                    Format: 2 letters + 3+ digits (e.g. TL001)
                  </Text>
                )}
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.chipContainer}>
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? colors.electricBlue : colors.surface,
                            borderColor: isSelected ? 'transparent' : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setCategory(c);
                          if (c === 'dolly') setSubtype(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            {
                              color: isSelected ? colors.textInverse : colors.text,
                              fontFamily: isSelected ? 'Lato_700Bold' : 'Lato_400Regular',
                            },
                          ]}
                        >
                          {AssetCategoryLabels[c]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Subtype — only for Trailer */}
              {category === 'trailer' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Subtype</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.scrollChip,
                        !subtype && styles.scrollChipSelected,
                      ]}
                      onPress={() => setSubtype(null)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.scrollChipText,
                          !subtype && styles.scrollChipTextSelected,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {TrailerSubtypes.map((st) => {
                      const isSelected = subtype === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.scrollChip,
                            isSelected && styles.scrollChipSelected,
                          ]}
                          onPress={() => setSubtype(st)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.scrollChipText,
                              isSelected && styles.scrollChipTextSelected,
                            ]}
                          >
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Make */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Make</Text>
                <TextInput
                  style={styles.input}
                  value={make}
                  onChangeText={setMake}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={100}
                />
              </View>

              {/* Model */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={100}
                />
              </View>

              {/* Year */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              {/* VIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>VIN</Text>
                <TextInput
                  style={styles.input}
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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registration No.</Text>
                <TextInput
                  style={styles.input}
                  value={registrationNumber}
                  onChangeText={setRegistrationNumber}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                />
              </View>

              {/* Registration Expiry */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registration Expiry</Text>
                <TextInput
                  style={styles.input}
                  value={registrationExpiry}
                  onChangeText={setRegistrationExpiry}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={10}
                />
              </View>

              {/* Depot */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Depot</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.scrollChip,
                      !selectedDepotId && styles.scrollChipSelected,
                    ]}
                    onPress={() => setSelectedDepotId(null)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.scrollChipText,
                        !selectedDepotId && styles.scrollChipTextSelected,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {depots.map((depot) => {
                    const isSelected = selectedDepotId === depot.id;
                    return (
                      <TouchableOpacity
                        key={depot.id}
                        style={[
                          styles.scrollChip,
                          isSelected && styles.scrollChipSelected,
                        ]}
                        onPress={() => setSelectedDepotId(depot.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.scrollChipText,
                            isSelected && styles.scrollChipTextSelected,
                          ]}
                        >
                          {depot.code.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => router.back()}
                  disabled={createMutation.isPending}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.saveButton,
                    (!isValid || createMutation.isPending) && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!isValid || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <LoadingDots color={colors.textInverse} size={8} />
                  ) : (
                    <Text style={styles.saveButtonText}>Create Asset</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CreateAssetOverlay
        visible={showOverlay}
        isSuccess={createMutation.isSuccess}
        isError={createMutation.isError}
        error={overlayError}
        onDismiss={handleOverlayDismiss}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.base,
  },
  inputGroup: {
    marginBottom: spacing.base,
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
    height: 48,
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  textArea: {
    height: 80,
    paddingTop: spacing.md,
  },
  hintText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.warning,
    marginTop: spacing.xs,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
  chipScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  scrollChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scrollChipSelected: {
    backgroundColor: colors.electricBlue,
    borderColor: 'transparent',
  },
  scrollChipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    textTransform: 'uppercase',
  },
  scrollChipTextSelected: {
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    marginBottom: spacing.base,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
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
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  saveButton: {
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
