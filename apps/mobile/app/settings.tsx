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
import { useUserPermissions } from '../src/contexts/UserPermissionsContext';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../src/theme/spacing';
import {
  ConfirmSheet,
  Button,
  CollapsibleSection,
  PillBadge,
} from '../src/components/common';
import { useConsoleStore } from '../src/store/consoleStore';
import { useSheetBottomPadding } from '../src/hooks/useSheetBottomPadding';
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
        <Ionicons name={icon} size={24} color={colors.electricBlue} />
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
  const sheetBottomPadding = useSheetBottomPadding();
  const { user, logout } = useAuthStore();
  const { canAccessAdmin } = useUserPermissions();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const consoleEnabled = useConsoleStore((s) => s.enabled);
  const setConsoleEnabled = useConsoleStore((s) => s.setEnabled);

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
      <View style={styles.safeArea}>
        <View style={styles.headerWrapper}>
          <View style={styles.headerContent}>
            <Ionicons name="settings" size={30} color={colors.textInverse} />
            <Text style={styles.headerTitle} numberOfLines={1}>Settings</Text>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.headerCloseButton}
            >
              <Ionicons name="close" size={26} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>

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
                icon="person"
                title="Edit Profile"
                subtitle="Update your name and contact info"
                onPress={() => setShowEditProfile(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="notifications"
                title="Notifications"
                subtitle="Manage notification preferences"
                onPress={() => setShowNotifications(true)}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="lock-closed"
                title="Security"
                subtitle="Password and authentication"
                onPress={() => setShowSecurity(true)}
              />
            </View>
          </View>

          {/* Administration — Superuser */}
          {canAccessAdmin && (
            <View style={styles.section}>
              <CollapsibleSection title="Administration" variant="flat" defaultExpanded>
                <View style={styles.card}>
                  <SettingsItem
                    icon="people"
                    title="User Management"
                    subtitle="Manage users, roles, and access"
                    onPress={() => router.push('/(admin)/users')}
                  />
                  <View style={styles.divider} />
                  <SettingsItem
                    icon="business"
                    title="Depot Management"
                    subtitle="Create, edit, and remove depots"
                    onPress={() => router.push('/(admin)/depots')}
                  />
                  <View style={styles.divider} />
                  <SettingsItem
                    icon="stats-chart"
                    title="Data Dashboard"
                    subtitle="Overview stats and data management"
                    onPress={() => router.push('/(admin)/data-dashboard')}
                  />
                  <View style={styles.divider} />
                  <SettingsItem
                    icon="cube"
                    title="Asset Administration"
                    subtitle="Bulk operations and asset deletion"
                    onPress={() => router.push('/(admin)/asset-admin')}
                  />
                  <View style={styles.divider} />
                  <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => setConsoleEnabled(v => !v)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: consoleEnabled }}
                    accessibilityLabel="Enable Console"
                  >
                    <View style={styles.settingsItemIcon}>
                      <Ionicons name="terminal" size={24} color={colors.electricBlue} />
                    </View>
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemTitle}>Enable Console</Text>
                      <Text style={styles.settingsItemSubtitle}>Diagnostics and sync tools</Text>
                    </View>
                    <Ionicons
                      name={consoleEnabled ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={consoleEnabled ? colors.electricBlue : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {consoleEnabled && (
                    <>
                      <View style={styles.divider} />
                      <SettingsItem
                        icon="terminal"
                        title="Console"
                        subtitle="Connection status and sync info"
                        onPress={() => router.push('/(admin)/debug')}
                      />
                    </>
                  )}
                </View>
              </CollapsibleSection>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, paddingBottom: sheetBottomPadding }}>
          <Button
            onPress={() => setShowLogoutConfirm(true)}
            color={colors.electricBlue}
            icon="log-out"
          >
            Sign Out
          </Button>
        </View>

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

        <ConfirmSheet
          visible={showLogoutConfirm}
          type="warning"
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign Out"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  headerWrapper: {
    backgroundColor: colors.electricBlue,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
