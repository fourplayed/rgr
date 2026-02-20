import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useAvatarStore } from '../../store/avatarStore';
import { UserRoleLabels } from '@rgr/shared';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

const HEADER_GRADIENT_START = '#0000CC';
const HEADER_GRADIENT_END = '#0000AA';

export function UserProfileHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { loadAvatar, getSelectedAvatar } = useAvatarStore();

  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;
  const selectedAvatar = getSelectedAvatar();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <LinearGradient
        colors={[HEADER_GRADIENT_START, HEADER_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Ionicons name={selectedAvatar.icon} size={28} color="#FFFFFF" />
          </View>

          {/* User Info: Name + Role */}
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {user.fullName}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>

          {/* Right side: Action buttons */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: HEADER_GRADIENT_START,
  },
  gradient: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
