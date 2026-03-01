import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../../src/store/authStore';
import { fetchProfile, getSupabaseClient } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';
import { getSession as getStoredSession } from '../../src/utils/secureStorage';
import type { Profile } from '@rgr/shared';

const SUPABASE_URL = Constants.expoConfig?.extra?.['supabaseUrl'] || process.env['EXPO_PUBLIC_SUPABASE_URL'] || 'Unknown';
const LOCAL_STORAGE_NAME = 'AsyncStorage (SecureStore)';

interface DebugInfo {
  localProfile: Profile | null;
  remoteProfile: Profile | null;
  localConnectionStatus: 'connected' | 'disconnected' | 'checking';
  remoteConnectionStatus: 'connected' | 'disconnected' | 'checking';
  syncStatus: 'synced' | 'out-of-sync' | 'checking' | 'error';
  lastSyncTime: string | null;
  storedSessionExists: boolean;
}

export default function DebugScreen() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    localProfile: null,
    remoteProfile: null,
    localConnectionStatus: 'checking',
    remoteConnectionStatus: 'checking',
    syncStatus: 'checking',
    lastSyncTime: null,
    storedSessionExists: false,
  });

  const fetchDebugInfo = useCallback(async () => {
    if (!user) return;

    setDebugInfo(prev => ({
      ...prev,
      localConnectionStatus: 'checking',
      remoteConnectionStatus: 'checking',
      syncStatus: 'checking',
    }));

    try {
      // Check local storage
      const storedSession = await getStoredSession();
      const localProfile = user;

      setDebugInfo(prev => ({
        ...prev,
        localProfile,
        localConnectionStatus: 'connected',
        storedSessionExists: !!storedSession,
      }));

      // Check remote connection and fetch remote profile
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData?.session) {
          const remoteResult = await fetchProfile(user.id);

          if (remoteResult.success) {
            const remoteProfile = remoteResult.data;

            // Compare local and remote
            const isInSync = JSON.stringify(localProfile) === JSON.stringify(remoteProfile);

            setDebugInfo(prev => ({
              ...prev,
              remoteProfile,
              remoteConnectionStatus: 'connected',
              syncStatus: isInSync ? 'synced' : 'out-of-sync',
              lastSyncTime: new Date().toLocaleTimeString(),
            }));
          } else {
            setDebugInfo(prev => ({
              ...prev,
              remoteConnectionStatus: 'disconnected',
              syncStatus: 'error',
            }));
          }
        } else {
          setDebugInfo(prev => ({
            ...prev,
            remoteConnectionStatus: 'disconnected',
            syncStatus: 'error',
          }));
        }
      } catch {
        setDebugInfo(prev => ({
          ...prev,
          remoteConnectionStatus: 'disconnected',
          syncStatus: 'error',
        }));
      }
    } catch {
      setDebugInfo(prev => ({
        ...prev,
        localConnectionStatus: 'disconnected',
        syncStatus: 'error',
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchDebugInfo();
  }, [fetchDebugInfo]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await checkAuth();
      await fetchDebugInfo();
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'synced':
        return colors.success;
      case 'disconnected':
      case 'out-of-sync':
      case 'error':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Debug</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {/* Connection Status */}
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Local Storage</Text>
              <View style={styles.debugStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(debugInfo.localConnectionStatus) }]} />
                <Text style={styles.debugValue}>{debugInfo.localConnectionStatus}</Text>
              </View>
            </View>
            <View style={styles.debugDivider} />

            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Remote Database</Text>
              <View style={styles.debugStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(debugInfo.remoteConnectionStatus) }]} />
                <Text style={styles.debugValue}>{debugInfo.remoteConnectionStatus}</Text>
              </View>
            </View>
            <View style={styles.debugDivider} />

            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Sync Status</Text>
              <View style={styles.debugStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(debugInfo.syncStatus) }]} />
                <Text style={styles.debugValue}>{debugInfo.syncStatus}</Text>
              </View>
            </View>
            <View style={styles.debugDivider} />

            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Session Token</Text>
              <Text style={styles.debugValue}>{debugInfo.storedSessionExists ? 'Stored' : 'None'}</Text>
            </View>
            <View style={styles.debugDivider} />

            {debugInfo.lastSyncTime && (
              <>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Last Checked</Text>
                  <Text style={styles.debugValue}>{debugInfo.lastSyncTime}</Text>
                </View>
                <View style={styles.debugDivider} />
              </>
            )}

            {/* Local Profile Data */}
            <View style={styles.debugDataSection}>
              <Text style={styles.debugSubtitle}>Local Profile</Text>
              <View style={styles.debugDataBox}>
                <Text style={styles.debugDataTextBold}>Storage: {LOCAL_STORAGE_NAME}</Text>
                {debugInfo.localProfile ? (
                  <>
                    <Text style={styles.debugDataText}>ID: {debugInfo.localProfile.id}</Text>
                    <Text style={styles.debugDataText}>Name: {debugInfo.localProfile.fullName}</Text>
                    <Text style={styles.debugDataText}>Email: {debugInfo.localProfile.email}</Text>
                    <Text style={styles.debugDataText}>Role: {debugInfo.localProfile.role}</Text>
                    <Text style={styles.debugDataText}>Depot: {debugInfo.localProfile.depot || 'None'}</Text>
                    <Text style={styles.debugDataText}>Updated: {debugInfo.localProfile.updatedAt}</Text>
                  </>
                ) : (
                  <Text style={styles.debugDataText}>No local data</Text>
                )}
              </View>
            </View>

            {/* Remote Profile Data */}
            <View style={styles.debugDataSection}>
              <Text style={styles.debugSubtitle}>Remote Profile</Text>
              <View style={styles.debugDataBox}>
                <Text style={styles.debugDataTextBold} numberOfLines={1}>Database: {SUPABASE_URL}</Text>
                {debugInfo.remoteProfile ? (
                  <>
                    <Text style={styles.debugDataText}>ID: {debugInfo.remoteProfile.id}</Text>
                    <Text style={styles.debugDataText}>Name: {debugInfo.remoteProfile.fullName}</Text>
                    <Text style={styles.debugDataText}>Email: {debugInfo.remoteProfile.email}</Text>
                    <Text style={styles.debugDataText}>Role: {debugInfo.remoteProfile.role}</Text>
                    <Text style={styles.debugDataText}>Depot: {debugInfo.remoteProfile.depot || 'None'}</Text>
                    <Text style={styles.debugDataText}>Updated: {debugInfo.remoteProfile.updatedAt}</Text>
                  </>
                ) : (
                  <Text style={styles.debugDataText}>No remote data</Text>
                )}
              </View>
            </View>

            {/* Sync Button */}
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSync}
              disabled={isSyncing}
              accessibilityRole="button"
              accessibilityLabel="Sync now"
              accessibilityHint="Double tap to synchronize local and remote profiles"
              accessibilityState={{ disabled: isSyncing }}
            >
              {isSyncing ? (
                <LoadingDots color={colors.textInverse} size={8} />
              ) : (
                <>
                  <Ionicons name="sync" size={20} color={colors.textInverse} />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  debugLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  debugStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  debugDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.base,
  },
  debugDataSection: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  debugSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  debugDataBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  debugDataText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  debugDataTextBold: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.base,
    marginVertical: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  syncButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
