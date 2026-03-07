import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { SheetModal } from '../common/SheetModal';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
import { useAuthStore } from '../../store/authStore';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

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
  const userName = user?.fullName;
  const userPhone = user?.phone;
  useEffect(() => {
    if (visible) {
      setFullName(userName || '');
      setPhone(userPhone || '');
      setError(null);
    }
  }, [visible, userName, userPhone]);

  const guard = useSubmitGuard();

  const handleSave = useCallback(
    () =>
      guard(async () => {
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
      }),
    [guard, fullName, phone, updateUserProfile, onClose]
  );

  return (
    <SheetModal visible={visible} onClose={onClose} keyboardAvoiding>
      <View style={styles.sheet}>
        <SheetHeader icon="person" title="Edit Profile" onClose={onClose} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Full Name</Text>
            <TextInput
              style={formStyles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Full name"
            />
          </View>

          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Phone (optional)</Text>
            <TextInput
              style={formStyles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              autoCorrect={false}
              accessibilityLabel="Phone number"
            />
          </View>

          {error && <Text style={formStyles.errorText}>{error}</Text>}
        </ScrollView>

        <SheetFooter>
          <View style={formStyles.buttonRow}>
            <Button variant="secondary" onPress={onClose} disabled={isLoading} flex>
              Cancel
            </Button>

            <Button isLoading={isLoading} onPress={handleSave} flex>
              Save
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
    maxHeight: '85%',
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    paddingTop: spacing.lg,
  },
});
