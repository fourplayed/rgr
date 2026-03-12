import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { LoadingDots } from '../common/LoadingDots';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { isAutoLoginEnabled, setAutoLoginEnabled } from '../../utils/secureStorage';
import { updatePassword, verifyCurrentPassword } from '@rgr/shared';
import { useAuthStore } from '../../store/authStore';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { AppText } from '../common';

interface SecurityModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

function isPasswordValid(validation: PasswordValidation): boolean {
  return Object.values(validation).every(Boolean);
}

interface ValidationRowProps {
  label: string;
  isValid: boolean;
}

function ValidationRow({ label, isValid }: ValidationRowProps) {
  return (
    <View style={styles.validationRow}>
      <Ionicons
        name={isValid ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={isValid ? colors.success : colors.textSecondary}
      />
      <AppText style={[styles.validationText, isValid && styles.validationTextValid]}>{label}</AppText>
    </View>
  );
}

export function SecurityModal({ visible, onClose }: SecurityModalProps) {
  const sheetBottomPadding = useSheetBottomPadding();
  const { user } = useAuthStore();
  const [autoLogin, setAutoLogin] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const loadAutoLoginState = useCallback(async () => {
    setAutoLoginLoading(true);
    const enabled = await isAutoLoginEnabled();
    setAutoLogin(enabled);
    setAutoLoginLoading(false);
  }, []);

  const resetPasswordForm = useCallback(() => {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }, []);

  useEffect(() => {
    if (visible) {
      loadAutoLoginState();
      resetPasswordForm();
    } else {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    }

    // Cleanup on unmount — prevents stale timer firing after component is gone
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, [visible, loadAutoLoginState, resetPasswordForm]);

  const handleAutoLoginToggle = async (enabled: boolean) => {
    const previous = autoLogin;
    setAutoLogin(enabled);
    try {
      await setAutoLoginEnabled(enabled);
    } catch {
      // Revert on secure storage failure
      setAutoLogin(previous);
      setError('Failed to update auto-login setting');
    }
  };

  const guard = useSubmitGuard();

  const handleChangePassword = () =>
    guard(async () => {
      setError(null);

      if (!currentPassword) {
        setError('Please enter your current password');
        return;
      }

      if (!isPasswordValid(validation)) {
        setError('Please meet all password requirements');
        return;
      }

      if (!passwordsMatch) {
        setError('Passwords do not match');
        return;
      }

      if (!user?.email) {
        setError('Unable to verify user. Please log in again.');
        return;
      }

      setIsLoading(true);

      try {
        // Verify current password before allowing change
        const verifyResult = await verifyCurrentPassword(user.email, currentPassword);
        if (!verifyResult.success) {
          setError('Current password is incorrect');
          return;
        }

        const result = await updatePassword(newPassword);

        if (result.success) {
          setSuccess(true);
          successTimerRef.current = setTimeout(() => {
            successTimerRef.current = null;
            resetPasswordForm();
          }, 2000);
        } else {
          setError(result.error || 'Failed to update password');
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    });

  return (
    <SheetModal visible={visible} onClose={onClose} keyboardAware>
      <View style={sheetLayout.container}>
        <SheetHeader icon="shield-checkmark" title="Security" onClose={onClose} />

        <BottomSheetScrollView
          style={sheetLayout.scroll}
          contentContainerStyle={[sheetLayout.scrollContent, { paddingBottom: sheetBottomPadding }]}
          bounces={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Auto-login Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <AppText style={styles.toggleTitle}>Stay Signed In</AppText>
                <AppText style={styles.toggleSubtitle}>
                  Automatically log in when you open the app
                </AppText>
              </View>
              {autoLoginLoading ? (
                <LoadingDots size={8} />
              ) : (
                <Switch
                  value={autoLogin}
                  onValueChange={handleAutoLoginToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              )}
            </View>
          </View>

          {/* Change Password */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Password</AppText>

            {!showPasswordForm ? (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setShowPasswordForm(true)}
              >
                <Ionicons name="key-outline" size={20} color={colors.electricBlue} />
                <AppText style={styles.changePasswordText}>Change Password</AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                {success ? (
                  <View style={styles.successMessage}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                    <AppText style={styles.successText}>Password updated successfully!</AppText>
                  </View>
                ) : (
                  <>
                    <View style={styles.inputGroup}>
                      <AppText style={styles.label}>Current Password</AppText>
                      <View style={styles.passwordInputWrapper}>
                        <AppTextInput
                          style={styles.passwordInput}
                          value={currentPassword}
                          onChangeText={setCurrentPassword}
                          placeholder="Enter current password"
                          secureTextEntry={!showCurrentPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel="Current password"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          <Ionicons
                            name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <AppText style={styles.label}>New Password</AppText>
                      <View style={styles.passwordInputWrapper}>
                        <AppTextInput
                          style={styles.passwordInput}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="Enter new password"
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel="New password"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowNewPassword(!showNewPassword)}
                        >
                          <Ionicons
                            name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.validationList}>
                        <ValidationRow
                          label="At least 8 characters"
                          isValid={validation.minLength}
                        />
                        <ValidationRow
                          label="One uppercase letter"
                          isValid={validation.hasUppercase}
                        />
                        <ValidationRow
                          label="One lowercase letter"
                          isValid={validation.hasLowercase}
                        />
                        <ValidationRow label="One number" isValid={validation.hasNumber} />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <AppText style={styles.label}>Confirm New Password</AppText>
                      <View style={styles.passwordInputWrapper}>
                        <AppTextInput
                          style={styles.passwordInput}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="Confirm new password"
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel="Confirm new password"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <Ionicons
                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                      {confirmPassword.length > 0 && (
                        <View style={styles.matchIndicator}>
                          <Ionicons
                            name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                            size={16}
                            color={passwordsMatch ? colors.success : colors.error}
                          />
                          <AppText
                            style={[
                              styles.matchText,
                              passwordsMatch ? styles.matchTextValid : styles.matchTextInvalid,
                            ]}
                          >
                            {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                          </AppText>
                        </View>
                      )}
                    </View>

                    {error && <AppText style={styles.errorText}>{error}</AppText>}

                    <View style={styles.passwordButtonRow}>
                      <Button
                        variant="secondary"
                        onPress={resetPasswordForm}
                        disabled={isLoading}
                        flex
                      >
                        Cancel
                      </Button>

                      <Button isLoading={isLoading} onPress={handleChangePassword} flex>
                        Update Password
                      </Button>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  toggleContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  changePasswordText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.electricBlue,
  },
  passwordForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  validationList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  validationText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  validationTextValid: {
    color: colors.success,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  matchText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  matchTextValid: {
    color: colors.success,
  },
  matchTextInvalid: {
    color: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.error,
    marginBottom: spacing.md,
  },
  passwordButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  successMessage: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  successText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.success,
  },
});
