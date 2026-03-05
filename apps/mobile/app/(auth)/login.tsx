import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Lato_700Bold } from '@expo-google-fonts/lato';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { listDepots } from '@rgr/shared';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { depotKeys } from '../../src/hooks/useDepots';
import { SaveCredentialsModal } from '../../src/components/auth/SaveCredentialsModal';
import { isAutoLoginEnabled } from '../../src/utils/secureStorage';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';
import { LoadingDots, AlertSheet } from '../../src/components/common';
import { logger } from '../../src/utils/logger';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER = Constants['nativeBuildVersion'] || Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '0';

const LOGIN_STRIPE_HEIGHT = 84;
const ACCENT_LINE_HEIGHT = 13;
const ACCENT_LINE_GAP = 6;

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login, isLoading, clearError, clearSavedSession, authError, clearAuthError } = useAuthStore();
  const { resolveDepot } = useLocationStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ visible: false, type: 'error', title: '', message: '' });

  useEffect(() => {
    if (authError) {
      setAlertSheet({
        visible: true,
        type: 'warning',
        title: 'Session Expired',
        message: authError,
      });
      clearAuthError();
    }
  }, [authError, clearAuthError]);
  const tiltAnim = useRef(new Animated.Value(-1)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const accentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      Animated.timing(keyboardOffset, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    const accentAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(accentAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(accentAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    accentAnimation.start();
    return () => accentAnimation.stop();
  }, [accentAnim]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tiltAnim, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [tiltAnim]);

  const [fontsLoaded] = useFonts({
    Lato_700Bold,
  });

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    // Clear previous errors
    clearError();
    clearAuthError();

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter both email and password',
      });
      return;
    }

    // Attempt login
    const result = await login(email.trim(), password);

    if (result.success) {
      // Fire and forget: fetch depots via React Query cache, then resolve location
      // Errors are non-fatal - user can still use the app without depot resolution
      queryClient.fetchQuery({
        queryKey: depotKeys.list(),
        queryFn: async () => {
          const result = await listDepots();
          if (!result.success) throw new Error(result.error);
          return result.data;
        },
        staleTime: 1000 * 60 * 10,
      }).then((depots) => resolveDepot(depots)).catch((err) => {
        logger.warn('Failed to resolve depot on login', err);
      });

      // Check if auto-login is already enabled
      const autoLoginAlreadyEnabled = await isAutoLoginEnabled();

      if (autoLoginAlreadyEnabled) {
        // Skip modal, go directly to tabs
        router.replace('/(tabs)');
      } else {
        // Show modal to ask about saving credentials
        setShowSaveModal(true);
      }
    } else if (result.error) {
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Login Failed',
        message: result.error,
      });
    }
  };

  const handleSaveCredentials = () => {
    // Session tokens are already saved during login, just navigate
    setShowSaveModal(false);
    router.replace('/(tabs)');
  };

  const handleSkipSave = async () => {
    // User doesn't want auto-login, clear the saved session tokens
    await clearSavedSession();
    setShowSaveModal(false);
    router.replace('/(tabs)');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
    <KeyboardAvoidingView
      style={styles.containerInner}
      behavior={Platform.OS === 'ios' ? undefined : 'height'}
      enabled={Platform.OS !== 'ios'}
    >
      <Animated.View style={[styles.content, { transform: [{ translateY: keyboardOffset }] }]}>
        <View style={styles.header}>
          <View style={styles.loginStripeContainer}>
            <View style={styles.loginAccentLine}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  transform: [{
                    translateX: accentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 100],
                    }),
                  }],
                }}
              >
                <LinearGradient
                  colors={['#00A4E4', '#00D4FF', '#00A4E4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1, width: '200%', marginLeft: '-50%' }}
                />
              </Animated.View>
            </View>
            <View style={styles.loginStripe}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  transform: [{
                    translateX: accentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 50],
                    }),
                  }],
                }}
              >
                <LinearGradient
                  colors={['#0000DD', '#0000FF', '#0000DD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1, width: '200%', marginLeft: '-50%' }}
                />
              </Animated.View>
            </View>
          </View>
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoShadow,
                {
                  transform: [
                    { perspective: 1000 },
                    {
                      rotateY: tiltAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-4deg', '4deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.Image
                source={require('../../src/assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !email && { fontStyle: 'italic' }]}
              placeholder="Enter your email address"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address to sign in"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, !password && { fontStyle: 'italic' }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              accessibilityLabel="Password"
              accessibilityHint="Enter your password to sign in"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isLoading ? "Signing in" : "Sign in"}
            accessibilityHint="Double tap to sign in to your account"
            accessibilityState={{ disabled: !isFormValid || isLoading }}
          >
            {isLoading ? (
              <LoadingDots color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>

    <Text style={styles.versionText}>v{APP_VERSION} ({BUILD_NUMBER})</Text>

    <SaveCredentialsModal
      visible={showSaveModal}
      onSave={handleSaveCredentials}
      onSkip={handleSkipSave}
    />

    <AlertSheet
      visible={alertSheet.visible}
      type={alertSheet.type}
      title={alertSheet.title}
      message={alertSheet.message}
      onDismiss={() => setAlertSheet(prev => ({ ...prev, visible: false }))}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  containerInner: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: -20,
    overflow: 'visible',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    overflow: 'visible',
    zIndex: 10,
    marginTop: -60,
  },
  loginStripeContainer: {
    position: 'absolute',
    left: -spacing.xl,
    right: -spacing.xl,
    top: 34,
    height: LOGIN_STRIPE_HEIGHT,
    zIndex: 1,
  },
  loginAccentLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ACCENT_LINE_HEIGHT,
    top: -(ACCENT_LINE_HEIGHT + ACCENT_LINE_GAP),
    overflow: 'hidden',
  },
  loginStripe: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 8,
    overflow: 'hidden',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: -12,
  },
  logoShadow: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10,
    elevation: 10,
  },
  logo: {
    width: 360,
    height: 180,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
    marginTop: -10,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    height: 48,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  versionText: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
