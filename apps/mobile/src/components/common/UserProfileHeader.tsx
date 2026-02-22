import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

const HEADER_GRADIENT_COLORS = ['#0000DD', '#000099'] as const;
const STATUS_BAR_GAP = 20; // Extra gap below status bar
const ACCENT_LINE_HEIGHT = 6;
const ACCENT_LINE_GAP = 3;

export function UserProfileHeader() {
  const router = useRouter();
  const segments = useSegments();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Show back button on detail pages (e.g., assets/[id])
  const isDetailPage = segments.length > 2 && segments[1] === 'assets' && segments[2] !== 'index';

  const handleBack = () => {
    router.back();
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.wrapper, { marginTop: insets.top + STATUS_BAR_GAP }]}>
      <View style={styles.accentLine} />
      <LinearGradient
        colors={[...HEADER_GRADIENT_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.actions}>
            {isDetailPage && (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSettings}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              accessibilityHint="Open settings screen"
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Logout"
              accessibilityHint="Sign out of your account"
            >
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const GRADIENT_HEIGHT = 45;

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 999,
    overflow: 'visible',
  },
  accentLine: {
    width: '100%',
    height: ACCENT_LINE_HEIGHT,
    backgroundColor: '#00A4E4',
    marginBottom: ACCENT_LINE_GAP,
  },
  gradient: {
    width: '100%',
    height: GRADIENT_HEIGHT,
    overflow: 'visible',
    zIndex: 999,
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    overflow: 'visible',
    zIndex: 999,
  },
  logo: {
    height: 88,
    width: 221,
    marginLeft: -5,
    marginTop: 6,
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
