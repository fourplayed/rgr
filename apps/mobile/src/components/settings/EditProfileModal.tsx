import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal } from '../common/SheetModal';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { useAuthStore } from '../../store/authStore';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const sheetBottomPadding = useSheetBottomPadding();
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
    <SheetModal visible={visible} onClose={onClose} keyboardAware>
      <View style={sheetLayout.container}>
        <SheetHeader icon="person" title="Edit Profile" onClose={onClose} />

        <ScrollView
          style={sheetLayout.scroll}
          contentContainerStyle={[sheetLayout.scrollContent, { paddingTop: spacing.lg, paddingBottom: sheetBottomPadding }]}
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

          <View style={[formStyles.buttonRow, { marginTop: spacing.lg }]}>
            <Button variant="secondary" onPress={onClose} disabled={isLoading} flex>
              Cancel
            </Button>

            <Button isLoading={isLoading} onPress={handleSave} flex>
              Save
            </Button>
          </View>
        </ScrollView>
      </View>
    </SheetModal>
  );
}

// All layout styles now via sheetLayout + useSheetBottomPadding
