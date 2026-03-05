import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { Button } from '../common/Button';
import { useSettingsStore } from '../../store/settingsStore';
import { useAnimatedSheet } from '../../hooks/useAnimatedSheet';

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
        <Text style={[styles.toggleTitle, disabled && styles.toggleTitleDisabled]}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
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
  const { notifications, setNotificationSetting } = useSettingsStore();
  const { modalVisible, backdropStyle, sheetStyle } = useAnimatedSheet(visible);

  const isPushDisabled = !notifications.pushEnabled;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.description}>
              Manage how you receive updates and alerts.
            </Text>

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

            <Button onPress={onClose}>
              Done
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  toggleList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
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
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleTitleDisabled: {
    color: colors.textSecondary,
  },
  toggleSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
