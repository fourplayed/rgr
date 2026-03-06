import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
  StyleSheet,
} from 'react-native';
import type { Depot, CreateDepotInput, UpdateDepotInput } from '@rgr/shared';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

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

  const handleSubmit = useCallback(() => guard(async () => {
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
  }), [guard, isValid, isEdit, name, code, address, isActive, onSubmit]);

  if (!visible) return null;

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
          <SheetHeader
            icon="business"
            title={isEdit ? 'Edit Depot' : 'Create Depot'}
            onClose={onClose}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Melbourne Central"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                maxLength={100}
                accessibilityLabel="Depot name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Code *</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="e.g., MELB"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                maxLength={20}
                accessibilityLabel="Depot code"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Optional"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                accessibilityLabel="Depot address"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.background}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <SheetFooter>
            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                onPress={onClose}
                disabled={isLoading}
                flex
              >
                Cancel
              </Button>

              <Button isLoading={isLoading} onPress={handleSubmit} disabled={!isValid} flex>
                {isEdit ? 'Save' : 'Create'}
              </Button>
            </View>
          </SheetFooter>
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
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
  },
});
