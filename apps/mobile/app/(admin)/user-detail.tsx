import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { UserRoleLabels } from '@rgr/shared';
import type { UserRole } from '@rgr/shared';
import { useUserList, useUpdateUserRole, useUpdateUserStatus } from '../../src/hooks/useAdminUsers';
import { useAuthStore } from '../../src/store/authStore';
import { UserRolePicker } from '../../src/components/admin/UserRolePicker';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';

export default function UserDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuthStore();

  const { data } = useUserList();
  const profile = useMemo(
    () => data?.data?.find((u) => u.id === userId) ?? null,
    [data, userId]
  );

  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  const updateRoleMutation = useUpdateUserRole();
  const updateStatusMutation = useUpdateUserStatus();

  const isSelf = currentUser?.id === userId;

  const handleRoleSelect = useCallback(
    (role: UserRole) => {
      if (!userId) return;
      setShowRolePicker(false);
      updateRoleMutation.mutate({ userId, role });
    },
    [userId, updateRoleMutation]
  );

  const handleToggleStatus = useCallback(() => {
    if (!userId || !profile) return;
    setShowStatusConfirm(false);
    updateStatusMutation.mutate({
      userId,
      isActive: !profile.isActive,
    });
  }, [userId, profile, updateStatusMutation]);

  if (!profile) {
    return (
      <LinearGradient
        colors={[...colors.gradientColors]}
        locations={[...colors.gradientLocations]}
        start={colors.gradientStart}
        end={colors.gradientEnd}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const roleColor =
    colors.userRole[profile.role as keyof typeof colors.userRole] ||
    colors.backgroundDark;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Detail</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.fullName}</Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
                <Text style={styles.roleBadgeText}>
                  {UserRoleLabels[profile.role]}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Details */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: profile.isActive ? colors.success : colors.error },
                ]}
              >
                {profile.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Depot</Text>
              <Text style={styles.detailValue}>{profile.depot || 'Not assigned'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{profile.phone || 'Not set'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Employee ID</Text>
              <Text style={styles.detailValue}>{profile.employeeId || 'Not set'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Login</Text>
              <Text style={styles.detailValue}>{formatDate(profile.lastLoginAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(profile.createdAt)}</Text>
            </View>
          </View>

          {/* Actions - hidden for self */}
          {!isSelf && (
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowRolePicker(true)}
                  disabled={updateRoleMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Change role"
                >
                  <View style={styles.actionContent}>
                    <Ionicons name="shield-outline" size={24} color={colors.textSecondary} />
                    <View style={styles.actionText}>
                      <Text style={styles.actionTitle}>Change Role</Text>
                      <Text style={styles.actionSubtitle}>
                        Current: {UserRoleLabels[profile.role]}
                      </Text>
                    </View>
                  </View>
                  {updateRoleMutation.isPending ? (
                    <LoadingDots color={colors.textSecondary} size={6} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowStatusConfirm(true)}
                  disabled={updateStatusMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={
                    profile.isActive ? 'Deactivate user' : 'Activate user'
                  }
                >
                  <View style={styles.actionContent}>
                    <Ionicons
                      name={profile.isActive ? 'close-circle-outline' : 'checkmark-circle-outline'}
                      size={24}
                      color={profile.isActive ? colors.error : colors.success}
                    />
                    <View style={styles.actionText}>
                      <Text style={styles.actionTitle}>
                        {profile.isActive ? 'Deactivate User' : 'Activate User'}
                      </Text>
                      <Text style={styles.actionSubtitle}>
                        {profile.isActive
                          ? 'Prevent user from logging in'
                          : 'Allow user to log in again'}
                      </Text>
                    </View>
                  </View>
                  {updateStatusMutation.isPending ? (
                    <LoadingDots
                      color={colors.textInverse}
                      size={6}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              {(updateRoleMutation.isError || updateStatusMutation.isError) && (
                <Text style={styles.errorText}>
                  {updateRoleMutation.error?.message || updateStatusMutation.error?.message}
                </Text>
              )}
            </View>
          )}

          {isSelf && (
            <View style={styles.selfNote}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.selfNoteText}>
                You cannot modify your own role or status
              </Text>
            </View>
          )}
        </ScrollView>

        <UserRolePicker
          visible={showRolePicker}
          currentRole={profile.role}
          onSelect={handleRoleSelect}
          onCancel={() => setShowRolePicker(false)}
        />

        <ConfirmSheet
          visible={showStatusConfirm}
          type={profile.isActive ? 'danger' : 'warning'}
          title={profile.isActive ? 'Deactivate User' : 'Activate User'}
          message={
            profile.isActive
              ? `${profile.fullName} will no longer be able to log in. This can be reversed.`
              : `${profile.fullName} will be able to log in again.`
          }
          confirmLabel={profile.isActive ? 'Deactivate' : 'Activate'}
          onConfirm={handleToggleStatus}
          onCancel={() => setShowStatusConfirm(false)}
          isLoading={updateStatusMutation.isPending}
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
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
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
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  actionsSection: {
    marginTop: spacing.lg,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  selfNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  selfNoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
