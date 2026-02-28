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
import { UserRoleLabels } from '@rgr/shared';
import type { UserRole } from '@rgr/shared';
import { useCreateUser } from '../../src/hooks/useAdminUsers';
import { useDepots } from '../../src/hooks/useDepots';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { CreateUserOverlay } from '../../src/components/admin/CreateUserOverlay';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';

const ROLES: UserRole[] = ['driver', 'mechanic', 'manager', 'superuser'];

export default function CreateUserScreen() {
  const router = useRouter();
  const createMutation = useCreateUser();
  const { data: depots = [] } = useDepots();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('driver');
  const [phone, setPhone] = useState('');
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const isValid = email.trim() && password.length >= 8 && fullName.trim();

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

    createMutation.mutate(
      {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        phone: phone.trim() || null,
        depot: selectedDepot,
      },
      {}
    );
  }, [
    isValid,
    email,
    password,
    fullName,
    role,
    phone,
    selectedDepot,
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
          <Text style={styles.headerTitle}>Create User</Text>
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
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="user@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Smith"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  maxLength={200}
                />
              </View>

              {/* Role Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.chipContainer}>
                  {ROLES.map((r) => {
                    const isSelected = role === r;
                    const roleColor =
                      colors.userRole[r as keyof typeof colors.userRole] ||
                      colors.backgroundDark;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleChip,
                          {
                            backgroundColor: isSelected ? roleColor : colors.surface,
                            borderColor: isSelected ? 'transparent' : colors.border,
                          },
                        ]}
                        onPress={() => setRole(r)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            {
                              color: isSelected ? colors.textInverse : colors.text,
                              fontFamily: isSelected ? 'Lato_700Bold' : 'Lato_400Regular',
                            },
                          ]}
                        >
                          {UserRoleLabels[r]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              </View>

              {/* Depot Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Depot</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.depotChipScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.depotChip,
                      !selectedDepot && styles.depotChipSelected,
                    ]}
                    onPress={() => setSelectedDepot(null)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.depotChipText,
                        !selectedDepot && styles.depotChipTextSelected,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {depots.map((depot) => {
                    const isSelected = selectedDepot === depot.code;
                    return (
                      <TouchableOpacity
                        key={depot.id}
                        style={[
                          styles.depotChip,
                          isSelected && styles.depotChipSelected,
                        ]}
                        onPress={() => setSelectedDepot(depot.code)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.depotChipText,
                            isSelected && styles.depotChipTextSelected,
                          ]}
                        >
                          {depot.code.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
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
                    <Text style={styles.saveButtonText}>Create User</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CreateUserOverlay
        visible={showOverlay}
        isPending={createMutation.isPending}
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
    fontWeight: fontWeight.bold,
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
  depotChipScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  depotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  depotChipSelected: {
    backgroundColor: colors.electricBlue,
    borderColor: 'transparent',
  },
  depotChipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    textTransform: 'uppercase',
  },
  depotChipTextSelected: {
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
