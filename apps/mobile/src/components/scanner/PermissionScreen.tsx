import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { styles } from './scan.styles';

interface PermissionScreenProps {
  /** If true, permission status is still loading */
  isLoading: boolean;
  /** Request camera permission callback */
  onRequestPermission: () => void;
}

export function PermissionScreen({ isLoading, onRequestPermission }: PermissionScreenProps) {
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.messageText}>Camera permission is required to scan QR codes</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={onRequestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
            accessibilityHint="Double tap to allow camera access for scanning QR codes"
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
