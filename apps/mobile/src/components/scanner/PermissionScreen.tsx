import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { styles } from './scan.styles';

interface PermissionScreenProps {
  /** If true, permission status is still loading */
  isLoading: boolean;
  /** Request camera permission callback */
  onRequestPermission: () => void;
  /** Whether the OS will show the permission prompt again */
  canAskAgain?: boolean;
}

export function PermissionScreen({ isLoading, onRequestPermission, canAskAgain = true }: PermissionScreenProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <Text style={styles.messageText}>Checking camera permission...</Text>
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
          <Text style={styles.messageText}>
            {showOpenSettings
              ? 'Camera access was denied. You can enable it in your device settings.'
              : 'Camera permission is required to scan QR codes'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={showOpenSettings ? () => Linking.openSettings() : onRequestPermission}
            accessibilityRole="button"
            accessibilityLabel={showOpenSettings ? 'Open Settings' : 'Grant camera permission'}
            accessibilityHint={showOpenSettings
              ? 'Double tap to open device settings to enable camera access'
              : 'Double tap to allow camera access for scanning QR codes'}
          >
            <Text style={styles.buttonText}>
              {showOpenSettings ? 'Open Settings' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
