import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAsset, useAssetScans, useAssetMaintenance } from '../../../hooks/useAssetData';
import { AssetInfoCard } from '../../../components/assets/AssetInfoCard';
import { useAuthStore } from '../../../store/authStore';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../theme/spacing';

export default function AssetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [showQRModal, setShowQRModal] = useState(false);

  const isSuperuser = user?.role === 'superuser';

  const {
    data: asset,
    isLoading: assetLoading,
    error: assetError,
  } = useAsset(id);

  const {
    data: scans = [],
    isLoading: scansLoading,
  } = useAssetScans(id);

  const {
    data: maintenance = [],
  } = useAssetMaintenance(id);

  if (assetLoading) {
    return (
      <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.electricBlue} />
        </View>
      </SafeAreaView>
      </View>
    );
  }

  if (assetError || !asset) {
    return (
      <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load asset</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </View>
    );
  }

  const recentScans = scans.slice(0, 5);
  const activeMaintenance = maintenance.filter(
    (m) => m.status === 'scheduled' || m.status === 'in_progress'
  );

  return (
    <View style={styles.container}>
    <SafeAreaView style={styles.containerInner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          {isSuperuser && asset.qrCodeData && (
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => setShowQRModal(true)}
            >
              <Ionicons name="qr-code-outline" size={18} color={colors.textInverse} />
              <Text style={styles.qrButtonText}>View QR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Text style={styles.scanButtonText}>Scan This Asset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AssetInfoCard asset={asset} />

        {/* Recent Scans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          {scansLoading ? (
            <ActivityIndicator color={colors.electricBlue} />
          ) : recentScans.length === 0 ? (
            <Text style={styles.emptyText}>No scans recorded</Text>
          ) : (
            <View style={styles.scanList}>
              {recentScans.map((scan) => (
                <View key={scan.id} style={styles.scanItem}>
                  <View>
                    <Text style={styles.scanType}>
                      {scan.scanType.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.scanTime}>
                      {formatRelativeTime(scan.createdAt)}
                    </Text>
                  </View>
                  {scan.latitude && scan.longitude && (
                    <Text style={styles.scanLocation}>
                      {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Active Maintenance */}
        {activeMaintenance.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Maintenance</Text>
            <View style={styles.maintenanceList}>
              {activeMaintenance.map((record) => (
                <View key={record.id} style={styles.maintenanceItem}>
                  <Text style={styles.maintenanceTitle}>
                    {record.maintenanceType?.replace(/_/g, ' ') ?? 'Maintenance'}
                  </Text>
                  <Text style={styles.maintenanceDescription}>
                    {record.description}
                  </Text>
                  <View style={styles.maintenanceFooter}>
                    <Text style={styles.maintenancePriority}>
                      {record.priority} priority
                    </Text>
                    <Text style={styles.maintenanceStatus}>
                      {record.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal - Superuser Only */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asset QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalAssetNumber}>{asset.assetNumber}</Text>
            <View style={styles.qrContainer}>
              {asset.qrCodeData && (
                <QRCode
                  value={asset.qrCodeData}
                  size={200}
                  color={colors.text}
                  backgroundColor={colors.background}
                />
              )}
            </View>
            <Text style={styles.qrDataText}>{asset.qrCodeData}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  containerInner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrButton: {
    backgroundColor: colors.electricBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  scanButton: {
    backgroundColor: colors.chrome,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  scanButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.backgroundDark,
  },
  content: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  scanList: {
    gap: spacing.md,
  },
  scanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scanType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'capitalize',
  },
  scanTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  scanLocation: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  maintenanceList: {
    gap: spacing.md,
  },
  maintenanceItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  maintenanceTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  maintenanceDescription: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  maintenanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maintenancePriority: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    fontFamily: 'Lato_400Regular',
    color: colors.warning,
    textTransform: 'capitalize',
  },
  maintenanceStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    fontFamily: 'Lato_400Regular',
    color: colors.info,
    textTransform: 'capitalize',
  },

  // QR Code Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalAssetNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    marginBottom: spacing.lg,
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  qrDataText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
