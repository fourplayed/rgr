import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Lato_700Bold } from '@expo-google-fonts/lato';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/authStore';
import { SaveCredentialsModal } from '../../components/auth/SaveCredentialsModal';
import { isAutoLoginEnabled } from '../../utils/secureStorage';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '0';

// Custom loading spinner component
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textInverse,
    marginHorizontal: 4,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.2],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, clearError, clearSavedSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const tiltAnim = useRef(new Animated.Value(-1)).current;

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

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Attempt login
    const result = await login(email.trim(), password);

    if (result.success) {
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
      Alert.alert('Login Failed', result.error);
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
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
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
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
              <LoadingDots />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>

    <Text style={styles.versionText}>v{APP_VERSION} ({BUILD_NUMBER})</Text>

    <SaveCredentialsModal
      visible={showSaveModal}
      onSave={handleSaveCredentials}
      onSkip={handleSkipSave}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  containerInner: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: -120,
    overflow: 'visible',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    overflow: 'visible',
    zIndex: 10,
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
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: '#000000',
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
    backgroundColor: '#0000FF',
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
    fontWeight: fontWeight.bold,
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
