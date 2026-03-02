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
import { useAuthStore } from '../src/store/authStore';
import { useTutorialStore } from '../src/store/tutorialStore';
import { useUserPermissions } from '../src/contexts/UserPermissionsContext';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/spacing';
import { AlertSheet } from '../src/components/common';
import { EditProfileModal } from '../src/components/settings/EditProfileModal';
import { NotificationsModal } from '../src/components/settings/NotificationsModal';
import { SecurityModal } from '../src/components/settings/SecurityModal';

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
  const { canAccessAdmin, canViewAuditLog, canPerformAssetCount } = useUserPermissions();
  const resetTutorials = useTutorialStore(s => s.resetAll);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTutorialReset, setShowTutorialReset] = useState(false);

  const handleResetTutorials = () => {
    resetTutorials();
    setShowTutorialReset(true);
  };

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
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.fullName}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: colors.userRole[user.role as keyof typeof colors.userRole] || colors.backgroundDark }]}>
                  <Text style={styles.roleText}>{roleLabel}</Text>
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

          {/* Help Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help</Text>
            <View style={styles.card}>
              <SettingsItem
                icon="book-outline"
                title="View Tutorials"
                subtitle={canPerformAssetCount
                  ? 'Re-watch the scanning and counting guides'
                  : 'Re-watch the scanning guide'}
                onPress={handleResetTutorials}
              />
            </View>
          </View>

          {/* Audit Log - Manager+ */}
          {canViewAuditLog && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Oversight</Text>
              <View style={styles.card}>
                <SettingsItem
                  icon="document-text-outline"
                  title="Audit Log"
                  subtitle="View system activity and changes"
                  onPress={() => router.push('/audit-log')}
                />
              </View>
            </View>
          )}

          {/* Administration Section - Superuser only */}
          {canAccessAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Administration</Text>
              <View style={styles.card}>
                <SettingsItem
                  icon="people-outline"
                  title="User Management"
                  subtitle="Manage users, roles, and access"
                  onPress={() => router.replace('/(admin)/users')}
                />
                <View style={styles.divider} />
                <SettingsItem
                  icon="business-outline"
                  title="Depot Management"
                  subtitle="Create, edit, and remove depots"
                  onPress={() => router.replace('/(admin)/depots')}
                />
                <View style={styles.divider} />
                <SettingsItem
                  icon="cube-outline"
                  title="Asset Administration"
                  subtitle="Bulk operations and asset deletion"
                  onPress={() => router.replace('/(admin)/asset-admin')}
                />
                <View style={styles.divider} />
                <SettingsItem
                  icon="bug-outline"
                  title="Debug"
                  subtitle="Connection status and sync info"
                  onPress={() => router.replace('/(admin)/debug')}
                />
              </View>
            </View>
          )}

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

        <AlertSheet
          visible={showTutorialReset}
          type="success"
          title="Tutorials Reset"
          message="Tutorials will show again next time you open the scanner or start a count."
          onDismiss={() => setShowTutorialReset(false)}
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
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.base,
  },
  profileInfo: {
    flex: 1,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
