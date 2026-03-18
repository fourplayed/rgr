import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineQueueStatus } from '../../hooks/useOfflineQueueStatus';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from './AppText';

/**
 * OfflineBanner - Displays a warning banner when the device is offline
 *
 * This component automatically monitors network state and displays a banner
 * at the top of the screen when the device loses internet connectivity.
 * It uses the useNetworkStatus hook to subscribe to network state changes.
 */
export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const { summary } = useOfflineQueueStatus();

  // Don't show banner if we're still checking (null) or if connected with reachable internet
  if (isConnected === null || isConnected === true) {
    return null;
  }

  const parts: string[] = [];
  if (summary.scan > 0) parts.push(`${summary.scan} scan${summary.scan > 1 ? 's' : ''}`);
  if (summary.photo > 0) parts.push(`${summary.photo} photo${summary.photo > 1 ? 's' : ''}`);
  if (summary.defect_report > 0)
    parts.push(`${summary.defect_report} defect${summary.defect_report > 1 ? 's' : ''}`);
  if (summary.maintenance > 0)
    parts.push(`${summary.maintenance} task${summary.maintenance > 1 ? 's' : ''}`);

  const queueText =
    parts.length > 0 ? `Offline — ${parts.join(', ')} pending` : 'Offline — recent data shown';

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLabel={queueText}>
      <AppText style={styles.text}>{queueText}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
  },
});
