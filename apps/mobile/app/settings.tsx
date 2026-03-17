import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useUserPermissions } from '../src/contexts/UserPermissionsContext';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../src/theme/spacing';
import { AppText, ConfirmSheet, CollapsibleSection, Badge } from '../src/components/common';
import { DepotBadge } from '../src/components/common/DepotBadge';
import { getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../src/hooks/useDepots';
import { useConsoleStore } from '../src/store/consoleStore';
import { SheetHeader } from '../src/components/common/SheetHeader';
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
        <AppText style={styles.settingsItemTitle}>{title}</AppText>
        {subtitle && <AppText style={styles.settingsItemSubtitle}>{subtitle}</AppText>}
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

  const depotLookup = useDepotLookup();

  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;
  const roleColor =
    colors.userRole[user.role as keyof typeof colors.userRole] || colors.backgroundDark;
  const userDepot = user.depot ? (depotLookup.byCode.get(user.depot.toLowerCase()) ?? null) : null;
  const { bg: depotBg, text: depotText } = getDepotBadgeColors(
    userDepot,
    colors.chrome,
    colors.text
  );

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        <View style={styles.safeArea}>
          <SheetHeader icon="settings" title="Settings" onClose={handleBack} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.base,
              paddingBottom: spacing['2xl'],
            }}
          >
            {/* Profile card */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileInfo}>
                    <AppText style={styles.profileName}>{user.fullName}</AppText>
                    <AppText style={styles.profileEmail}>{user.email}</AppText>
                  </View>
                  <View style={styles.badgeColumn}>
                    <Badge label={roleLabel} color={roleColor} />
                    {user.depot && (
                      <DepotBadge
                        label={user.depot}
                        bgColor={depotBg}
                        textColor={depotText}
                        showIcon
                      />
                    )}
                  </View>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.signOutRow}
                  onPress={() => setShowLogoutConfirm(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Sign Out"
                >
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                  <AppText style={styles.signOutText}>Sign Out</AppText>
                </TouchableOpacity>
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
                      onPress={() => setConsoleEnabled(!consoleEnabled)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: consoleEnabled }}
                      accessibilityLabel="Enable Console"
                    >
                      <View style={styles.settingsItemIcon}>
                        <Ionicons name="terminal" size={24} color={colors.electricBlue} />
                      </View>
                      <View style={styles.settingsItemContent}>
                        <AppText style={styles.settingsItemTitle}>Enable Console</AppText>
                        <AppText style={styles.settingsItemSubtitle}>
                          Diagnostics and sync tools
                        </AppText>
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

          <EditProfileModal visible={showEditProfile} onClose={() => setShowEditProfile(false)} />

          <NotificationsModal
            visible={showNotifications}
            onClose={() => setShowNotifications(false)}
          />

          <SecurityModal visible={showSecurity} onClose={() => setShowSecurity(false)} />

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
    </BottomSheetModalProvider>
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
  scrollView: {
    flex: 1,
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
  badgeColumn: {
    alignItems: 'flex-end',
    gap: spacing.xs,
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
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
  },
  signOutText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
