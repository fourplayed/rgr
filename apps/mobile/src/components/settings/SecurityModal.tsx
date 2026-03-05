import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { LoadingDots } from '../common/LoadingDots';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import { isAutoLoginEnabled, setAutoLoginEnabled } from '../../utils/secureStorage';
import { updatePassword, verifyCurrentPassword } from '@rgr/shared';
import { useAuthStore } from '../../store/authStore';
import { useAnimatedSheet } from '../../hooks/useAnimatedSheet';

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
      <Text style={[styles.validationText, isValid && styles.validationTextValid]}>
        {label}
      </Text>
    </View>
  );
}

export function SecurityModal({ visible, onClose }: SecurityModalProps) {
  const { user } = useAuthStore();
  const [autoLogin, setAutoLogin] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(true);
  const { modalVisible, backdropStyle, sheetStyle } = useAnimatedSheet(visible);

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
    setAutoLogin(enabled);
    await setAutoLoginEnabled(enabled);
  };

  const handleChangePassword = async () => {
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

    // Verify current password before allowing change
    const verifyResult = await verifyCurrentPassword(user.email, currentPassword);
    if (!verifyResult.success) {
      setIsLoading(false);
      setError('Current password is incorrect');
      return;
    }

    const result = await updatePassword(newPassword);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      successTimerRef.current = setTimeout(() => {
        successTimerRef.current = null;
        resetPasswordForm();
      }, 2000);
    } else {
      setError(result.error || 'Failed to update password');
    }
  };

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

          <ScrollView style={styles.scrollContent} bounces={false}>
            <View style={styles.content}>
              <Text style={styles.title}>Security</Text>

              {/* Auto-login Toggle */}
              <View style={styles.section}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Stay Signed In</Text>
                    <Text style={styles.toggleSubtitle}>
                      Automatically log in when you open the app
                    </Text>
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
                <Text style={styles.sectionTitle}>Password</Text>

                {!showPasswordForm ? (
                  <TouchableOpacity
                    style={styles.changePasswordButton}
                    onPress={() => setShowPasswordForm(true)}
                  >
                    <Ionicons name="key-outline" size={20} color={colors.electricBlue} />
                    <Text style={styles.changePasswordText}>Change Password</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.passwordForm}>
                    {success ? (
                      <View style={styles.successMessage}>
                        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                        <Text style={styles.successText}>Password updated successfully!</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Current Password</Text>
                          <View style={styles.passwordInputWrapper}>
                            <TextInput
                              style={styles.passwordInput}
                              value={currentPassword}
                              onChangeText={setCurrentPassword}
                              placeholder="Enter current password"
                              placeholderTextColor={colors.textSecondary}
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
                          <Text style={styles.label}>New Password</Text>
                          <View style={styles.passwordInputWrapper}>
                            <TextInput
                              style={styles.passwordInput}
                              value={newPassword}
                              onChangeText={setNewPassword}
                              placeholder="Enter new password"
                              placeholderTextColor={colors.textSecondary}
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
                            <ValidationRow label="At least 8 characters" isValid={validation.minLength} />
                            <ValidationRow label="One uppercase letter" isValid={validation.hasUppercase} />
                            <ValidationRow label="One lowercase letter" isValid={validation.hasLowercase} />
                            <ValidationRow label="One number" isValid={validation.hasNumber} />
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Confirm New Password</Text>
                          <View style={styles.passwordInputWrapper}>
                            <TextInput
                              style={styles.passwordInput}
                              value={confirmPassword}
                              onChangeText={setConfirmPassword}
                              placeholder="Confirm new password"
                              placeholderTextColor={colors.textSecondary}
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
                              <Text
                                style={[
                                  styles.matchText,
                                  passwordsMatch ? styles.matchTextValid : styles.matchTextInvalid,
                                ]}
                              >
                                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <View style={styles.passwordButtonRow}>
                          <Button
                            variant="secondary"
                            onPress={resetPasswordForm}
                            disabled={isLoading}
                            flex
                          >
                            Cancel
                          </Button>

                          <TouchableOpacity
                            style={[
                              styles.saveButton,
                              isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleChangePassword}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <LoadingDots color={colors.textInverse} size={8} />
                            ) : (
                              <Text style={styles.saveButtonText}>Update Password</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>

              <Button onPress={onClose}>
                Done
              </Button>
            </View>
          </ScrollView>
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
    maxHeight: '85%',
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
  scrollContent: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_400Regular',
  },
  matchTextValid: {
    color: colors.success,
  },
  matchTextInvalid: {
    color: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    marginBottom: spacing.md,
  },
  passwordButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  successMessage: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  successText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.success,
  },
});
