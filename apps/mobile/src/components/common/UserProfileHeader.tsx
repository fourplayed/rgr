import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

const HEADER_GRADIENT_COLORS = ['#000099', '#0000CC', '#000099'] as const;
const STATUS_BAR_GAP = 20; // Extra gap below status bar

export function UserProfileHeader() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.wrapper, { marginTop: insets.top + STATUS_BAR_GAP }]}>
      <LinearGradient
        colors={[...HEADER_GRADIENT_COLORS]}
        locations={[0, 0.5, 1]}
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

const GRADIENT_HEIGHT = 50;

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 999,
    overflow: 'visible',
  },
  gradient: {
    width: '100%',
    height: GRADIENT_HEIGHT,
    overflow: 'visible',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 9,
    elevation: 16,
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
    height: 80,
    width: 200,
    marginLeft: -5,
    marginTop: 10,
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
