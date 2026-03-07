import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useTutorialStore } from '../src/store/tutorialStore';
import { useUserPermissions } from '../src/contexts/UserPermissionsContext';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../src/theme/spacing';
import {
  AlertSheet,
  ConfirmSheet,
  Button,
  SheetHeader,
  SheetFooter,
  CollapsibleSection,
  PillBadge,
} from '../src/components/common';
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
  const { user, logout } = useAuthStore();
  const { canAccessAdmin, canViewAuditLog } = useUserPermissions();
  const resetTutorials = useTutorialStore(s => s.resetAll);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTutorialReset, setShowTutorialReset] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleResetTutorials = () => {
    resetTutorials();
    setShowTutorialReset(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const handleBack = () => {
    router.back();
  };

  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;
  const roleColor = colors.userRole[user.role as keyof typeof colors.userRole] || colors.backgroundDark;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <SheetHeader icon="settings" title="Settings" onClose={handleBack} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.fullName}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
                <PillBadge icon="person" label={roleLabel} color={roleColor} />
              </View>
            </View>
          </View>

          {/* Account */}
          <View style={styles.section}>
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

          {/* Help */}
          <View style={styles.section}>
            <View style={styles.card}>
              <SettingsItem
                icon="book-outline"
                title="View Tutorials"
                subtitle="Re-watch the scanning guide"
                onPress={handleResetTutorials}
              />
            </View>
          </View>

          {/* Oversight — Manager+ */}
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

          {/* Administration — Superuser */}
          {canAccessAdmin && (
            <View style={styles.section}>
              <CollapsibleSection title="Administration" variant="flat" defaultExpanded>
                <View style={styles.card}>
                  <SettingsItem
                    icon="people-outline"
                    title="User Management"
                    subtitle="Manage users, roles, and access"
                    onPress={() => router.push('/(admin)/users')}
                  />
                  <View style={styles.divider} />
                  <SettingsItem
                    icon="business-outline"
                    title="Depot Management"
                    subtitle="Create, edit, and remove depots"
                    onPress={() => router.push('/(admin)/depots')}
                  />
                  <View style={styles.divider} />
                  <SettingsItem
                    icon="cube-outline"
                    title="Asset Administration"
                    subtitle="Bulk operations and asset deletion"
                    onPress={() => router.push('/(admin)/asset-admin')}
                  />
                  <View style={styles.divider} />
                  <SettingsItem
                    icon="bug-outline"
                    title="Debug"
                    subtitle="Connection status and sync info"
                    onPress={() => router.push('/(admin)/debug')}
                  />
                </View>
              </CollapsibleSection>
            </View>
          )}
        </ScrollView>

        <SheetFooter>
          <Button
            onPress={() => setShowLogoutConfirm(true)}
            variant="secondary"
            icon="log-out-outline"
          >
            Sign Out
          </Button>
        </SheetFooter>

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

        <ConfirmSheet
          visible={showLogoutConfirm}
          type="warning"
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign Out"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  safeArea: {
    flex: 1,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsItemSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 40 + spacing.md,
  },
});
