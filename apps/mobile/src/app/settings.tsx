import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme/spacing';
import { EditProfileModal } from '../components/settings/EditProfileModal';
import { NotificationsModal } from '../components/settings/NotificationsModal';
import { SecurityModal } from '../components/settings/SecurityModal';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, showChevron = true }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.settingsItemIcon}>
        <Ionicons name={icon} size={24} color={colors.backgroundDark} />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const handleBack = () => {
    router.back();
  };

  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={32} color={colors.textInverse} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.fullName}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: colors.userRole[user.role as keyof typeof colors.userRole] || colors.backgroundDark }]}>
                    <Text style={styles.roleText}>{roleLabel}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <SettingsItem
                icon="person-outline"
                title="Edit Profile"
                subtitle="Update your name and contact info"
                onPress={() => setShowEditProfile(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="notifications-outline"
                title="Notifications"
                subtitle="Manage notification preferences"
                onPress={() => setShowNotifications(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="lock-closed-outline"
                title="Security"
                subtitle="Password and authentication"
                onPress={() => setShowSecurity(true)}
              />
            </View>
          </View>

          {/* App Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App</Text>
            <View style={styles.card}>
              <SettingsItem
                icon="information-circle-outline"
                title="About"
                subtitle="Version 1.0.0"
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="help-circle-outline"
                title="Help & Support"
                subtitle="Get help with the app"
              />
            </View>
          </View>

          {/* User Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.card}>
              {user.employeeId && (
                <>
                  <SettingsItem
                    icon="id-card-outline"
                    title="Employee ID"
                    subtitle={user.employeeId}
                    showChevron={false}
                  />
                  <View style={styles.divider} />
                </>
              )}
              {user.depot && (
                <>
                  <SettingsItem
                    icon="location-outline"
                    title="Depot"
                    subtitle={user.depot}
                    showChevron={false}
                  />
                  <View style={styles.divider} />
                </>
              )}
              {user.phone && (
                <SettingsItem
                  icon="call-outline"
                  title="Phone"
                  subtitle={user.phone}
                  showChevron={false}
                />
              )}
              {!user.employeeId && !user.depot && !user.phone && (
                <SettingsItem
                  icon="information-outline"
                  title="No additional details"
                  showChevron={false}
                />
              )}
            </View>
          </View>
        </ScrollView>

        <EditProfileModal
          visible={showEditProfile}
          onClose={() => setShowEditProfile(false)}
        />

        <NotificationsModal
          visible={showNotifications}
          onClose={() => setShowNotifications(false)}
        />

        <SecurityModal
          visible={showSecurity}
          onClose={() => setShowSecurity(false)}
        />
      </SafeAreaView>
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsItemContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  settingsItemTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  settingsItemSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 40 + spacing.md,
  },
});
