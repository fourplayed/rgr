import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import { useSettingsStore } from '../../store/settingsStore';
import { AppText } from '../common';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ToggleRowProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ title, subtitle, value, onValueChange, disabled }: ToggleRowProps) {
  return (
    <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
      <View style={styles.toggleContent}>
        <AppText style={[styles.toggleTitle, disabled && styles.toggleTitleDisabled]}>{title}</AppText>
        <AppText style={styles.toggleSubtitle}>{subtitle}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
        disabled={disabled}
      />
    </View>
  );
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const sheetBottomPadding = useSheetBottomPadding();
  const { notifications, setNotificationSetting } = useSettingsStore();

  const isPushDisabled = !notifications.pushEnabled;

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={sheetLayout.container}>
        <SheetHeader icon="notifications" title="Notifications" onClose={onClose} />

        <BottomSheetScrollView
          style={sheetLayout.scroll}
          contentContainerStyle={[sheetLayout.scrollContent, { paddingBottom: sheetBottomPadding }]}
          bounces={true}
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.description}>Manage how you receive updates and alerts.</AppText>

          <View style={styles.comingSoonBanner}>
            <AppText style={styles.comingSoonText}>
              Push notifications are not yet connected to a delivery service. These preferences are
              saved locally and will take effect once notifications are enabled.
            </AppText>
          </View>

          <View style={styles.toggleList}>
            <ToggleRow
              title="Push Notifications"
              subtitle="Receive alerts on your device"
              value={notifications.pushEnabled}
              onValueChange={(value) => setNotificationSetting('pushEnabled', value)}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Email Notifications"
              subtitle="Receive updates via email"
              value={notifications.emailEnabled}
              onValueChange={(value) => setNotificationSetting('emailEnabled', value)}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Maintenance Alerts"
              subtitle="Get notified about equipment issues"
              value={notifications.maintenanceAlerts && notifications.pushEnabled}
              onValueChange={(value) => setNotificationSetting('maintenanceAlerts', value)}
              disabled={isPushDisabled}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Scan Confirmations"
              subtitle="Confirm when equipment is scanned"
              value={notifications.scanConfirmations && notifications.pushEnabled}
              onValueChange={(value) => setNotificationSetting('scanConfirmations', value)}
              disabled={isPushDisabled}
            />
          </View>
          <Button onPress={onClose} style={{ alignSelf: 'stretch' }}>
            Done
          </Button>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginVertical: spacing.lg,
  },
  toggleList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleTitleDisabled: {
    color: colors.textSecondary,
  },
  toggleSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  comingSoonBanner: {
    backgroundColor: colors.warningSurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  comingSoonText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
