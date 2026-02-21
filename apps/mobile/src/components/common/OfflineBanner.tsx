import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight } from '../../theme/spacing';

/**
 * OfflineBanner - Displays a warning banner when the device is offline
 *
 * This component automatically monitors network state and displays a banner
 * at the top of the screen when the device loses internet connectivity.
 * It uses the useNetworkStatus hook to subscribe to network state changes.
 */
export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Don't show banner if we're still checking (null) or if connected
  if (isConnected === null || isConnected === true) {
    return null;
  }

  // Show banner if not connected, or if connected but internet is not reachable
  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No Internet Connection</Text>
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
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
  },
});
