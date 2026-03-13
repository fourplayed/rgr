import React, { useState, useEffect, useCallback } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import type { Depot, CreateDepotInput, UpdateDepotInput } from '@rgr/shared';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { AppText } from '../common';

interface DepotFormSheetProps {
  visible: boolean;
  depot?: Depot | null; // null/undefined = create mode
  onSubmit: (input: CreateDepotInput | UpdateDepotInput) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function DepotFormSheet({
  visible,
  depot,
  onSubmit,
  onClose,
  isLoading = false,
}: DepotFormSheetProps) {
  const sheetBottomPadding = useSheetBottomPadding();
  const isEdit = !!depot;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const depotName = depot?.name;
  const depotCode = depot?.code;
  const depotAddress = depot?.address;
  const depotIsActive = depot?.isActive;

  useEffect(() => {
    if (visible) {
      if (isEdit) {
        setName(depotName ?? '');
        setCode(depotCode ?? '');
        setAddress(depotAddress ?? '');
        setIsActive(depotIsActive ?? true);
      } else {
        setName('');
        setCode('');
        setAddress('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [visible, isEdit, depotName, depotCode, depotAddress, depotIsActive]);

  const isValid = name.trim() && code.trim();
  const guard = useSubmitGuard();

  const handleSubmit = useCallback(
    () =>
      guard(async () => {
        if (!isValid) return;
        setError(null);
        try {
          if (isEdit) {
            const update: UpdateDepotInput = {
              name: name.trim(),
              code: code.trim(),
              address: address.trim() || null,
              isActive,
            };
            await onSubmit(update);
          } else {
            const create: CreateDepotInput = {
              name: name.trim(),
              code: code.trim(),
              address: address.trim() || null,
              isActive,
            };
            await onSubmit(create);
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        }
      }),
    [guard, isValid, isEdit, name, code, address, isActive, onSubmit]
  );

  if (!visible) return null;

  return (
    <SheetModal visible={visible} onClose={onClose} keyboardAware>
      <View style={sheetLayout.container}>
        <SheetHeader
          icon="business"
          title={isEdit ? 'Edit Depot' : 'Create Depot'}
          onClose={onClose}
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
          <View style={styles.inputGroup}>
            <AppText style={formStyles.label}>Name *</AppText>
            <AppTextInput
              style={formStyles.inputFixed}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Melbourne Central"
              autoCapitalize="words"
              maxLength={100}
              accessibilityLabel="Depot name"
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText style={formStyles.label}>Code *</AppText>
            <AppTextInput
              style={formStyles.inputFixed}
              value={code}
              onChangeText={setCode}
              placeholder="e.g., MELB"
              autoCapitalize="characters"
              maxLength={20}
              accessibilityLabel="Depot code"
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText style={formStyles.label}>Address</AppText>
            <AppTextInput
              style={formStyles.inputFixed}
              value={address}
              onChangeText={setAddress}
              placeholder="Optional"
              autoCapitalize="words"
              accessibilityLabel="Depot address"
            />
          </View>

          <View style={styles.toggleRow}>
            <AppText style={formStyles.label}>Active</AppText>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.background}
            />
          </View>

          {error && <AppText style={styles.errorText}>{error}</AppText>}

          <View style={[formStyles.buttonRow, { marginTop: spacing.lg }]}>
            <Button variant="secondary" onPress={onClose} disabled={isLoading} flex>
              Cancel
            </Button>

            <Button isLoading={isLoading} onPress={handleSubmit} disabled={!isValid} flex>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </View>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  // Looser rhythm than the shared default (spacing.base vs spacing.md)
  inputGroup: {
    marginBottom: spacing.base,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  // Larger bottom margin than shared default (spacing.base vs spacing.md)
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.error,
    marginBottom: spacing.base,
  },
});
