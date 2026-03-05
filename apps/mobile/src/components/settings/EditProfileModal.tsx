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
  Animated,
} from 'react-native';
import { LoadingDots } from '../common/LoadingDots';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useAnimatedSheet } from '../../hooks/useAnimatedSheet';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { user, updateUserProfile } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { modalVisible, backdropStyle, sheetStyle } = useAnimatedSheet(visible);

  useEffect(() => {
    if (visible && user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setError(null);
    }
  }, [visible, user]);

  const guard = useSubmitGuard();

  const handleSave = useCallback(() => guard(async () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await updateUserProfile({
      fullName: fullName.trim(),
      phone: phone.trim() || null,
    });

    setIsLoading(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to update profile');
    }
  }), [guard, fullName, phone, updateUserProfile, onClose]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <Text style={styles.title}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Full name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                autoCorrect={false}
                accessibilityLabel="Phone number"
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                onPress={onClose}
                disabled={isLoading}
                flex
              >
                Cancel
              </Button>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingDots color={colors.textInverse} size={8} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
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
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
