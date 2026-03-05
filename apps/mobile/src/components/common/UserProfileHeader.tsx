import React, { useState, useCallback } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { ConfirmSheet } from './ConfirmSheet';
import {
  HEADER_STATUS_BAR_GAP,
  HEADER_ACCENT_LINE_HEIGHT,
  HEADER_ACCENT_LINE_GAP,
  HEADER_GRADIENT_HEIGHT,
} from '../../theme/layout';

import { colors } from '../../theme/colors';

const HEADER_GRADIENT_COLORS = colors.brandGradientHeader;
const LOGO_WIDTH = 221;

export function UserProfileHeader() {
  const router = useRouter();
  const segments = useSegments();
  const logout = useAuthStore(s => s.logout);
  const insets = useSafeAreaInsets();

  // Show back button on detail pages (e.g., assets/[id])
  const segmentArray = segments as string[];
  const isDetailPage = segmentArray.length > 2 && segmentArray[1] === 'assets' && segmentArray[2] !== 'index';

  const handleBack = useCallback(() => {
    // Navigate to assets list explicitly to handle cross-tab navigation
    router.navigate('/(tabs)/assets');
  }, [router]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogoutPress = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  return (
    <View style={[styles.wrapper, { marginTop: insets.top + HEADER_STATUS_BAR_GAP }]}>
      <View style={styles.accentLine} />
      <LinearGradient
        colors={[...HEADER_GRADIENT_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <View style={{ width: LOGO_WIDTH }} />
          <View style={styles.actions}>
            {isDetailPage && (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSettings}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              accessibilityHint="Open settings screen"
            >
              <Ionicons name="settings-outline" size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogoutPress}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Logout"
              accessibilityHint="Sign out of your account"
            >
              <Ionicons name="log-out-outline" size={24} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ConfirmSheet
        visible={showLogoutConfirm}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  accentLine: {
    width: '100%',
    height: HEADER_ACCENT_LINE_HEIGHT,
    backgroundColor: colors.electricBlue,
    marginBottom: HEADER_ACCENT_LINE_GAP,
    zIndex: 1,
  },
  gradient: {
    width: '100%',
    height: HEADER_GRADIENT_HEIGHT,
    overflow: 'visible',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 16,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    overflow: 'visible',
  },
  logo: {
    position: 'absolute',
    height: 88,
    width: LOGO_WIDTH,
    left: -5,
    top: -8,
    zIndex: 999,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    padding: 8,
  },
});
