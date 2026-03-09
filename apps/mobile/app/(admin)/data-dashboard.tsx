import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdminDataStats } from '../../src/hooks/useAdminDataStats';
import { useCountUp } from '../../src/hooks/useCountUp';
import { SheetHeader } from '../../src/components/common/SheetHeader';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';

function CountUpValue({ value, style }: { value: number; style: object }) {
  const display = useCountUp(value);
  return <Text style={style}>{display}</Text>;
}

const STAT_CARDS = [
  {
    key: 'assets',
    label: 'Assets',
    icon: 'cube' as const,
    color: colors.electricBlue,
    route: '/(admin)/asset-admin' as const,
    getValue: (s: { totalAssets: number }) => s.totalAssets,
    getSubtitle: (s: { activeAssets: number }) => `${s.activeAssets} active`,
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: 'construct' as const,
    color: colors.info,
    route: '/(admin)/maintenance-admin' as const,
    getValue: (s: { totalMaintenance: number }) => s.totalMaintenance,
    getSubtitle: (s: { scheduledMaintenance: number }) => `${s.scheduledMaintenance} scheduled`,
  },
  {
    key: 'defects',
    label: 'Defects',
    icon: 'warning' as const,
    color: colors.defectYellow,
    route: '/(admin)/defects-admin' as const,
    getValue: (s: { totalDefects: number }) => s.totalDefects,
    getSubtitle: (s: { reportedDefects: number }) => `${s.reportedDefects} reported`,
  },
  {
    key: 'photos',
    label: 'Photos',
    icon: 'camera' as const,
    color: colors.textSecondary,
    route: '/(admin)/photos-admin' as const,
    getValue: (s: { totalPhotos: number }) => s.totalPhotos,
    getSubtitle: () => 'total uploaded',
  },
] as const;

export default function DataDashboardScreen() {
  const router = useRouter();
  const { data: stats, isLoading, error, refetch } = useAdminDataStats();

  return (
    <View style={styles.container}>
      <SheetHeader icon="stats-chart" title="Data Dashboard" onClose={() => router.back()} closeIcon="arrow-back" />

        {isLoading ? (
          <View style={styles.centerContent}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load stats</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, paddingBottom: spacing['3xl'] }}
          >
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              {STAT_CARDS.map((card) => (
                <TouchableOpacity
                  key={card.key}
                  style={[styles.statCard, { backgroundColor: card.color }]}
                  onPress={() => router.push(card.route)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.label}: ${stats ? card.getValue(stats as any) : 0}. Tap to manage.`}
                >
                  <View style={styles.statRow}>
                    <Ionicons name={card.icon} size={32} color="#FFFFFF" style={styles.statIcon} />
                    <CountUpValue
                      value={stats ? card.getValue(stats as any) : 0}
                      style={styles.statValue}
                    />
                  </View>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  <Text style={styles.statSubtitle}>
                    {stats ? card.getSubtitle(stats as any) : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scans info row */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="qr-code" size={24} color={colors.electricBlue} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Total Scans</Text>
                  <Text style={styles.infoValue}>{stats?.totalScans ?? 0}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  scrollView: { flex: 1 },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: {
    marginRight: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statValue: {
    fontSize: fontSize.hero,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryButton: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
