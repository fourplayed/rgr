import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/authStore';
import { fetchProfile, getSupabaseClient, isSupabaseInitialized } from '@rgr/shared';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useLocationStore } from '../../src/store/locationStore';
import { useDebugLocationStore } from '../../src/store/debugLocationStore';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';
import { getSession as getStoredSession } from '../../src/utils/secureStorage';
import type { Profile } from '@rgr/shared';
import { AppText } from '../../src/components/common';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.['supabaseUrl'] ||
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ||
  'Unknown';
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

// --- Helper functions ---

const getBooleanColor = (v: boolean | null) =>
  v === null ? colors.warning : v ? colors.success : colors.error;

const boolLabel = (v: boolean | null) => (v === null ? 'Checking...' : v ? 'Yes' : 'No');

function formatFixAge(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

// --- Helper components ---

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.debugRow}>
      <AppText style={styles.debugLabel}>{label}</AppText>
      <AppText style={styles.debugValue}>{value}</AppText>
    </View>
  );
}

function DebugStatusRow({
  label,
  status,
  statusLabel,
}: {
  label: string;
  status: boolean | null;
  statusLabel?: string;
}) {
  const displayLabel = statusLabel ?? boolLabel(status);
  return (
    <View style={styles.debugRow} accessibilityLabel={`${label}: ${displayLabel}`}>
      <AppText style={styles.debugLabel}>{label}</AppText>
      <View style={styles.debugStatusRow}>
        <View style={[styles.statusDot, { backgroundColor: getBooleanColor(status) }]} />
        <AppText style={styles.debugValue}>{displayLabel}</AppText>
      </View>
    </View>
  );
}

// --- Health banner logic ---

type HealthLevel = 'ok' | 'warning' | 'critical';

function deriveHealth(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
  isAuthenticated: boolean,
  syncStatus: string,
  lastLocation: { timestamp: number } | null,
  resolvedDepot: unknown
): { level: HealthLevel; message: string } {
  // Critical checks first
  if (isConnected === false) return { level: 'critical', message: 'Offline' };
  if (isInternetReachable === false) return { level: 'critical', message: 'No Internet' };
  if (!isAuthenticated) return { level: 'critical', message: 'Not Authenticated' };
  if (syncStatus === 'error' || syncStatus === 'out-of-sync')
    return { level: 'critical', message: 'Sync Error' };

  // Warning checks
  const gpsStale = !lastLocation || Date.now() - lastLocation.timestamp > 5 * 60 * 1000; // 5 min
  if (gpsStale) return { level: 'warning', message: 'GPS Stale' };
  if (!resolvedDepot) return { level: 'warning', message: 'No Depot Resolved' };

  // Still checking network
  if (isConnected === null || isInternetReachable === null)
    return { level: 'warning', message: 'Checking Network...' };

  return { level: 'ok', message: 'All Systems OK' };
}

const healthColors: Record<HealthLevel, string> = {
  ok: colors.success,
  warning: colors.warning,
  critical: colors.error,
};

// --- Simulated location card (DEV only) ---

function SimulatedLocationCard() {
  const { overrideEnabled, latitude, longitude, setEnabled, setCoordinates } =
    useDebugLocationStore();
  const [latText, setLatText] = useState(latitude.toString());
  const [lonText, setLonText] = useState(longitude.toString());

  const applyCoordinates = useCallback(() => {
    const lat = parseFloat(latText);
    const lon = parseFloat(lonText);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setCoordinates(lat, lon);
    }
  }, [latText, lonText, setCoordinates]);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      applyCoordinates();
      setEnabled(enabled);
    },
    [applyCoordinates, setEnabled]
  );

  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle}>Simulated Location</AppText>
      <View style={styles.card}>
        <View style={styles.debugRow}>
          <AppText style={styles.debugLabel}>Enabled</AppText>
          <Switch
            value={overrideEnabled}
            onValueChange={handleToggle}
            trackColor={{ true: colors.electricBlue }}
          />
        </View>
        <View style={styles.debugDivider} />
        <View style={styles.debugRow}>
          <AppText style={styles.debugLabel}>Latitude</AppText>
          <TextInput
            style={styles.simInput}
            value={latText}
            onChangeText={setLatText}
            onBlur={applyCoordinates}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            placeholder="-90 to 90"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.debugDivider} />
        <View style={styles.debugRow}>
          <AppText style={styles.debugLabel}>Longitude</AppText>
          <TextInput
            style={styles.simInput}
            value={lonText}
            onChangeText={setLonText}
            onBlur={applyCoordinates}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            placeholder="-180 to 180"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );
}

// --- Main screen ---

export default function DebugScreen() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const autoLoginAttempted = useAuthStore((s) => s.autoLoginAttempted);
  const authError = useAuthStore((s) => s.authError);
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Location store — individual selectors to minimize re-renders
  const resolvedDepot = useLocationStore((s) => s.resolvedDepot);
  const lastLocation = useLocationStore((s) => s.lastLocation);
  const depotResolutionError = useLocationStore((s) => s.depotResolutionError);

  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    localProfile: null,
    remoteProfile: null,
    localConnectionStatus: 'checking',
    remoteConnectionStatus: 'checking',
    syncStatus: 'checking',
    lastSyncTime: null,
    storedSessionExists: false,
  });

  // Guard async setState calls against unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Tick for GPS age display (every 10s)
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // One-shot permission check (no side effects unlike useLocation)
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (!isMountedRef.current) return;
      setHasPermission(status === 'granted');
    });
  }, []);

  const fetchDebugInfo = useCallback(async () => {
    if (!user) return;

    setDebugInfo((prev) => ({
      ...prev,
      localConnectionStatus: 'checking',
      remoteConnectionStatus: 'checking',
      syncStatus: 'checking',
    }));

    try {
      // Check local storage
      const storedSession = await getStoredSession();
      if (!isMountedRef.current) return;
      const localProfile = user;

      setDebugInfo((prev) => ({
        ...prev,
        localProfile,
        localConnectionStatus: 'connected',
        storedSessionExists: !!storedSession,
      }));

      // Check remote connection and fetch remote profile
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!isMountedRef.current) return;

        if (sessionData?.session) {
          const remoteResult = await fetchProfile(user.id);
          if (!isMountedRef.current) return;

          if (remoteResult.success) {
            const remoteProfile = remoteResult.data;

            // Compare local and remote
            const isInSync = JSON.stringify(localProfile) === JSON.stringify(remoteProfile);

            setDebugInfo((prev) => ({
              ...prev,
              remoteProfile,
              remoteConnectionStatus: 'connected',
              syncStatus: isInSync ? 'synced' : 'out-of-sync',
              lastSyncTime: new Date().toLocaleTimeString(),
            }));
          } else {
            setDebugInfo((prev) => ({
              ...prev,
              remoteConnectionStatus: 'disconnected',
              syncStatus: 'error',
            }));
          }
        } else {
          setDebugInfo((prev) => ({
            ...prev,
            remoteConnectionStatus: 'disconnected',
            syncStatus: 'error',
          }));
        }
      } catch {
        if (!isMountedRef.current) return;
        setDebugInfo((prev) => ({
          ...prev,
          remoteConnectionStatus: 'disconnected',
          syncStatus: 'error',
        }));
      }
    } catch {
      if (!isMountedRef.current) return;
      setDebugInfo((prev) => ({
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

  const handleCopyDiagnostics = async () => {
    const appName = Constants.expoConfig?.name ?? 'RGR';
    const version = Constants.expoConfig?.version ?? '?';
    const build = Constants.expoConfig?.ios?.buildNumber ?? '?';

    const networkLine = `Network: ${isConnected ? 'Connected \u2713' : isConnected === false ? 'Disconnected \u2717' : 'Checking...'} | Internet: ${isInternetReachable ? 'Reachable \u2713' : isInternetReachable === false ? 'Unreachable \u2717' : 'Checking...'}`;

    let gpsLine = 'GPS: No fix';
    if (lastLocation) {
      const acc =
        lastLocation.accuracy !== null ? `\u00B1${Math.round(lastLocation.accuracy)}m` : '';
      const age = formatFixAge(lastLocation.timestamp);
      gpsLine = `GPS: ${lastLocation.latitude.toFixed(2)}, ${lastLocation.longitude.toFixed(2)} (${acc}, ${age})`;
    }

    const depotLine = resolvedDepot
      ? `Depot: ${resolvedDepot.depot.name} (${resolvedDepot.distanceKm.toFixed(1)}km)`
      : 'Depot: None';

    const authLine = `Auth: ${isAuthenticated ? 'OK' : 'Not authenticated'} | Auto-login: ${autoLoginAttempted ? 'Yes' : 'No'}`;

    const syncLine = `Sync: ${debugInfo.syncStatus} | Local \u2194 Remote: ${debugInfo.syncStatus === 'synced' ? 'Match' : debugInfo.syncStatus}`;

    const checkedLine = `Checked: ${new Date().toLocaleTimeString()}`;

    const text = [
      `${appName} v${version} (build ${build})`,
      networkLine,
      gpsLine,
      depotLine,
      authLine,
      syncLine,
      checkedLine,
    ].join('\n');

    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Health banner
  const health = deriveHealth(
    isConnected,
    isInternetReachable,
    isAuthenticated,
    debugInfo.syncStatus,
    lastLocation,
    resolvedDepot
  );

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
        <SheetHeader
          icon="terminal"
          title="Console"
          onClose={() => router.back()}
          closeIcon="arrow-back"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.base,
            paddingBottom: spacing.lg,
          }}
        >
          {/* 1. Health Banner */}
          <View
            style={[styles.healthBanner, { backgroundColor: healthColors[health.level] }]}
            accessibilityLabel={`System status: ${health.message}`}
          >
            <AppText style={styles.healthBannerText}>{health.message}</AppText>
          </View>

          {/* 2. Network */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Network</AppText>
            <View style={styles.card}>
              <DebugStatusRow label="Connected" status={isConnected} />
              <View style={styles.debugDivider} />
              <DebugStatusRow label="Internet Reachable" status={isInternetReachable} />
            </View>
          </View>

          {/* 3. Location & Depot */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Location & Depot</AppText>
            <View style={styles.card}>
              <DebugStatusRow
                label="Location Permission"
                status={hasPermission}
                statusLabel={
                  hasPermission === null ? 'Checking...' : hasPermission ? 'Granted' : 'Denied'
                }
              />
              <View style={styles.debugDivider} />
              <DebugRow
                label="Last Fix"
                value={
                  lastLocation
                    ? `${lastLocation.latitude.toFixed(5)}, ${lastLocation.longitude.toFixed(5)}${lastLocation.accuracy !== null ? ` (\u00B1${Math.round(lastLocation.accuracy)}m)` : ''}`
                    : 'No fix'
                }
              />
              <View style={styles.debugDivider} />
              {lastLocation && (
                <>
                  <DebugRow label="Fix Age" value={formatFixAge(lastLocation.timestamp)} />
                  <View style={styles.debugDivider} />
                </>
              )}
              <DebugRow
                label="Resolved Depot"
                value={
                  resolvedDepot
                    ? `${resolvedDepot.depot.name} (${resolvedDepot.distanceKm.toFixed(1)} km)`
                    : 'None'
                }
              />
              {depotResolutionError && (
                <>
                  <View style={styles.debugDivider} />
                  <View style={styles.debugRow}>
                    <AppText style={styles.debugLabel}>Resolution Error</AppText>
                    <AppText style={[styles.debugValue, { color: colors.error }]}>
                      {depotResolutionError}
                    </AppText>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 3.5. Simulated Location (DEV only) */}
          {__DEV__ && <SimulatedLocationCard />}

          {/* 4. Auth */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Auth</AppText>
            <View style={styles.card}>
              <DebugStatusRow label="Authenticated" status={isAuthenticated} />
              <View style={styles.debugDivider} />
              <DebugStatusRow label="Auto-Login Attempted" status={autoLoginAttempted} />
              {authError && (
                <>
                  <View style={styles.debugDivider} />
                  <View style={styles.debugRow}>
                    <AppText style={styles.debugLabel}>Auth Error</AppText>
                    <AppText style={[styles.debugValue, { color: colors.error }]}>
                      {authError}
                    </AppText>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 5. Sync (existing card, unchanged) */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Sync</AppText>
            <View style={styles.card}>
              {/* Connection Status */}
              <View style={styles.debugRow}>
                <AppText style={styles.debugLabel}>Local Storage</AppText>
                <View style={styles.debugStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(debugInfo.localConnectionStatus) },
                    ]}
                  />
                  <AppText style={styles.debugValue}>{debugInfo.localConnectionStatus}</AppText>
                </View>
              </View>
              <View style={styles.debugDivider} />

              <View style={styles.debugRow}>
                <AppText style={styles.debugLabel}>Remote Database</AppText>
                <View style={styles.debugStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(debugInfo.remoteConnectionStatus) },
                    ]}
                  />
                  <AppText style={styles.debugValue}>{debugInfo.remoteConnectionStatus}</AppText>
                </View>
              </View>
              <View style={styles.debugDivider} />

              <View style={styles.debugRow}>
                <AppText style={styles.debugLabel}>Sync Status</AppText>
                <View style={styles.debugStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(debugInfo.syncStatus) },
                    ]}
                  />
                  <AppText style={styles.debugValue}>{debugInfo.syncStatus}</AppText>
                </View>
              </View>
              <View style={styles.debugDivider} />

              <View style={styles.debugRow}>
                <AppText style={styles.debugLabel}>Session Token</AppText>
                <AppText style={styles.debugValue}>
                  {debugInfo.storedSessionExists ? 'Stored' : 'None'}
                </AppText>
              </View>
              <View style={styles.debugDivider} />

              {debugInfo.lastSyncTime && (
                <>
                  <View style={styles.debugRow}>
                    <AppText style={styles.debugLabel}>Last Checked</AppText>
                    <AppText style={styles.debugValue}>{debugInfo.lastSyncTime}</AppText>
                  </View>
                  <View style={styles.debugDivider} />
                </>
              )}

              {/* Local Profile Data */}
              <View style={styles.debugDataSection}>
                <AppText style={styles.debugSubtitle}>Local Profile</AppText>
                <View style={styles.debugDataBox}>
                  <AppText style={styles.debugDataTextBold}>Storage: {LOCAL_STORAGE_NAME}</AppText>
                  {debugInfo.localProfile ? (
                    <>
                      <AppText style={styles.debugDataText}>
                        ID: {debugInfo.localProfile.id}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Name: {debugInfo.localProfile.fullName}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Email: {debugInfo.localProfile.email}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Role: {debugInfo.localProfile.role}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Depot: {debugInfo.localProfile.depot || 'None'}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Updated: {debugInfo.localProfile.updatedAt}
                      </AppText>
                    </>
                  ) : (
                    <AppText style={styles.debugDataText}>No local data</AppText>
                  )}
                </View>
              </View>

              {/* Remote Profile Data */}
              <View style={styles.debugDataSection}>
                <AppText style={styles.debugSubtitle}>Remote Profile</AppText>
                <View style={styles.debugDataBox}>
                  <AppText style={styles.debugDataTextBold} numberOfLines={1}>
                    Database: {SUPABASE_URL}
                  </AppText>
                  {debugInfo.remoteProfile ? (
                    <>
                      <AppText style={styles.debugDataText}>
                        ID: {debugInfo.remoteProfile.id}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Name: {debugInfo.remoteProfile.fullName}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Email: {debugInfo.remoteProfile.email}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Role: {debugInfo.remoteProfile.role}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Depot: {debugInfo.remoteProfile.depot || 'None'}
                      </AppText>
                      <AppText style={styles.debugDataText}>
                        Updated: {debugInfo.remoteProfile.updatedAt}
                      </AppText>
                    </>
                  ) : (
                    <AppText style={styles.debugDataText}>No remote data</AppText>
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
                    <AppText style={styles.syncButtonText}>Sync Now</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 6. App Info */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>App</AppText>
            <View style={styles.card}>
              <DebugRow label="App Name" value={Constants.expoConfig?.name ?? 'Unknown'} />
              <View style={styles.debugDivider} />
              <DebugRow label="Version" value={Constants.expoConfig?.version ?? 'Unknown'} />
              <View style={styles.debugDivider} />
              <DebugRow label="Build" value={Constants.expoConfig?.ios?.buildNumber ?? 'Unknown'} />
              <View style={styles.debugDivider} />
              <DebugStatusRow label="Supabase Initialized" status={isSupabaseInitialized()} />
            </View>
          </View>

          {/* 7. Copy Diagnostics */}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyDiagnostics}
            accessibilityRole="button"
            accessibilityLabel="Copy diagnostics to clipboard"
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={20}
              color={colors.textInverse}
            />
            <AppText style={styles.copyButtonText}>
              {copied ? 'Copied!' : 'Copy Diagnostics'}
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Health banner
  healthBanner: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  healthBannerText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Sections (from settings.tsx pattern)
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
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
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  debugValue: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    flexShrink: 1,
    textAlign: 'right',
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  debugDataTextBold: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.electricBlue,
    marginHorizontal: spacing.base,
    marginVertical: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  syncButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  // Copy diagnostics button
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.electricBlue,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  copyButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  simInput: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'right',
    minWidth: 120,
    paddingVertical: spacing.xs,
  },
});
