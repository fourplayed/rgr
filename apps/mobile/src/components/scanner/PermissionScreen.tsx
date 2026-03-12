import React from 'react';
import { View, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { styles } from './scan.styles';
import { AppText } from '../common';

interface PermissionScreenProps {
  /** If true, permission status is still loading */
  isLoading: boolean;
  /** Request camera permission callback */
  onRequestPermission: () => void;
  /** Whether the OS will show the permission prompt again */
  canAskAgain?: boolean;
}

export function PermissionScreen({
  isLoading,
  onRequestPermission,
  canAskAgain = true,
}: PermissionScreenProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <AppText style={styles.messageText}>Checking camera permission...</AppText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const showOpenSettings = canAskAgain === false;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <AppText style={styles.messageText}>
            {showOpenSettings
              ? 'Camera access was denied. You can enable it in your device settings.'
              : 'Camera permission is required to scan QR codes'}
          </AppText>
          <TouchableOpacity
            style={styles.button}
            onPress={showOpenSettings ? () => Linking.openSettings() : onRequestPermission}
            accessibilityRole="button"
            accessibilityLabel={showOpenSettings ? 'Open Settings' : 'Grant camera permission'}
            accessibilityHint={
              showOpenSettings
                ? 'Double tap to open device settings to enable camera access'
                : 'Double tap to allow camera access for scanning QR codes'
            }
          >
            <AppText style={styles.buttonText}>
              {showOpenSettings ? 'Open Settings' : 'Grant Permission'}
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
