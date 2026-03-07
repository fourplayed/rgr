import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';

/**
 * OfflineBanner - Displays a warning banner when the device is offline
 *
 * This component automatically monitors network state and displays a banner
 * at the top of the screen when the device loses internet connectivity.
 * It uses the useNetworkStatus hook to subscribe to network state changes.
 */
export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  // Don't show banner if we're still checking (null) or if connected with reachable internet
  if (isConnected === null || isConnected === true) {
    return null;
  }

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Recent data is shown. Scanning is unavailable."
    >
      <Text style={styles.text}>Offline — recent data shown, scanning unavailable</Text>
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
