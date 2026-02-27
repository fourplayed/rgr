import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, Depot } from '@rgr/shared';
import type { CachedLocationData } from '../../store/locationStore';
import { colors } from '../../theme/colors';
import { styles } from './scan.styles';

interface CameraOverlayProps {
  // Asset count mode
  assetCountActive: boolean;
  assetCountDepotName: string | null;
  assetCountScanCount: number;

  // Footer
  hasLocationPermission: boolean;
  onRequestLocationPermission: () => void;
  canPerformAssetCount: boolean;
  onStartAssetCount: () => void;
  onEndAssetCount: () => void;

  // Debug scan (dev only)
  onDebugScan: () => void;
  cachedDepot: { depot: Depot; distanceKm: number } | null;
}

export function CameraOverlay({
  assetCountActive,
  assetCountDepotName,
  assetCountScanCount,
  hasLocationPermission,
  onRequestLocationPermission,
  canPerformAssetCount,
  onStartAssetCount,
  onEndAssetCount,
  onDebugScan,
}: CameraOverlayProps) {
  return (
    <SafeAreaView style={styles.overlay}>
      <View style={styles.header}>
        {assetCountActive ? (
          <>
            <View style={styles.assetCountBadge}>
              <Ionicons name="clipboard-outline" size={14} color={colors.textInverse} />
              <Text style={styles.assetCountBadgeText}>Asset Count Mode</Text>
            </View>
            <Text style={styles.title}>{assetCountDepotName}</Text>
            <Text style={styles.subtitle}>
              {assetCountScanCount} assets counted
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Scan QR Code</Text>
            <Text style={styles.subtitle}>
              Point camera at asset QR code
            </Text>
          </>
        )}
      </View>

      {/* Scanning frame */}
      <View style={styles.scanFrame}>
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />
      </View>

      <View style={styles.footer}>
        {!hasLocationPermission && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onRequestLocationPermission}
            accessibilityRole="button"
            accessibilityLabel="Enable location"
            accessibilityHint="Double tap to grant location permission for scan tracking"
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        )}

        {/* Debug button for simulator testing */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={onDebugScan}
          >
            <Ionicons name="bug-outline" size={18} color={colors.warning} />
            <Text style={styles.debugButtonText}>Debug Scan</Text>
          </TouchableOpacity>
        )}

        {/* Asset Count button for managers+ */}
        {canPerformAssetCount && (
          <TouchableOpacity
            style={[
              styles.assetCountButton,
              assetCountActive && styles.assetCountButtonActive,
            ]}
            onPress={assetCountActive ? onEndAssetCount : onStartAssetCount}
            accessibilityRole="button"
            accessibilityLabel={assetCountActive ? 'End asset count' : 'Start asset count'}
          >
            <Ionicons
              name={assetCountActive ? 'stop-circle-outline' : 'clipboard-outline'}
              size={18}
              color={assetCountActive ? colors.error : colors.electricBlue}
            />
            <Text
              style={[
                styles.assetCountButtonText,
                assetCountActive && styles.assetCountButtonTextActive,
              ]}
            >
              {assetCountActive ? 'End Count' : 'Asset Count'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
