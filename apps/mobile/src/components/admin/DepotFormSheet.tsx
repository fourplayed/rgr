import React, { useState, useEffect } from 'react';
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
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface DepotFormSheetProps {
  visible: boolean;
  depot?: Depot | null; // null/undefined = create mode
  onSubmit: (input: CreateDepotInput | UpdateDepotInput) => void;
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
        setAddress(depotAddress || '');
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

  const handleSubmit = () => {
    if (!isValid) return;
    setError(null);
    if (isEdit) {
      const update: UpdateDepotInput = {
        name: name.trim(),
        code: code.trim(),
        address: address.trim() || null,
        isActive,
      };
      onSubmit(update);
    } else {
      const create: CreateDepotInput = {
        name: name.trim(),
        code: code.trim(),
        address: address.trim() || null,
        isActive,
      };
      onSubmit(create);
    }
  };

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
          <View style={styles.handle} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {isEdit ? 'Edit Depot' : 'Create Depot'}
            </Text>

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

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (!isValid || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <LoadingDots color={colors.textInverse} size={8} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEdit ? 'Save' : 'Create'}
                  </Text>
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
    maxHeight: '85%',
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
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.lg,
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
