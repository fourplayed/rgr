import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LoadingDots } from '../../../src/components/common/LoadingDots';
import { RefreshLoadingDots } from '../../../src/components/common/RefreshLoadingDots';
import { ScreenHeader } from '../../../src/components/common/ScreenHeader';
import { DepotFilterChips } from '../../../src/components/assets/DepotFilterChips';
import { useCountHistorySessions } from '../../../src/hooks/useCountHistoryData';
import { useDepots } from '../../../src/hooks/useDepots';
import { useUserPermissions } from '../../../src/contexts/UserPermissionsContext';
import { useLocationStore } from '../../../src/store/locationStore';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import type { AssetCountSessionWithNames, AssetCountSessionStatus } from '@rgr/shared';

const SESSION_CARD_HEIGHT = 88;

const STATUS_LABELS: Record<AssetCountSessionStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatSessionDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Session Card ──

interface SessionCardProps {
  session: AssetCountSessionWithNames;
  onPress: (session: AssetCountSessionWithNames) => void;
}

const SessionCard = memo(function SessionCard({ session, onPress }: SessionCardProps) {
  const statusColor = colors.countSessionStatus[session.status] ?? colors.info;
  const statusLabel = STATUS_LABELS[session.status] ?? session.status;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusColor }]}
      onPress={() => onPress(session)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Count session on ${formatSessionDate(session.startedAt)}, ${session.totalAssetsCounted} assets counted`}
      accessibilityHint="Opens session details"
    >
      <View style={styles.cardRow}>
        <Text style={styles.cardDate}>{formatSessionDate(session.startedAt)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardCount}>
          {session.totalAssetsCounted} asset{session.totalAssetsCounted !== 1 ? 's' : ''} counted
        </Text>
        <View style={styles.cardMeta}>
          {session.counterName && (
            <Text style={styles.cardMetaText} numberOfLines={1}>
              {session.counterName}
            </Text>
          )}
          {session.depotCode && (
            <View style={styles.depotCodeBadge}>
              <Text style={styles.depotCodeText}>{session.depotCode}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── Count History Screen ──

export default function CountHistoryScreen() {
  const router = useRouter();
  const { canPerformAssetCount } = useUserPermissions();
  const { data: depots = [] } = useDepots();
  const resolvedDepot = useLocationStore((s) => s.resolvedDepot);

  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);

  // Auto-default to nearest depot on mount
  useEffect(() => {
    if (resolvedDepot?.depot && !selectedDepotId) {
      setSelectedDepotId(resolvedDepot.depot.id);
    }
  }, [resolvedDepot, selectedDepotId]);

  const { data, isLoading, error, refetch, isRefetching } = useCountHistorySessions({
    depotId: selectedDepotId ?? undefined,
    page: 1,
  });

  const sessions = data?.data ?? [];

  const handleSessionPress = useCallback(
    (session: AssetCountSessionWithNames) => {
      router.push(`/(tabs)/assets/session/${session.id}`);
    },
    [router]
  );

  const handleSelectDepot = useCallback((depotId: string | null) => {
    setSelectedDepotId(depotId);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AssetCountSessionWithNames }) => (
      <SessionCard session={item} onPress={handleSessionPress} />
    ),
    [handleSessionPress]
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: SESSION_CARD_HEIGHT,
      offset: SESSION_CARD_HEIGHT * index,
      index,
    }),
    []
  );

  // Permission guard
  if (!canPerformAssetCount) {
    router.replace('/(tabs)/assets');
    return null;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        {/* Header */}
        <ScreenHeader title="Count History" onBack={() => router.back()} />

        {/* Depot filter */}
        <DepotFilterChips
          depots={depots}
          selectedDepotId={selectedDepotId}
          onSelectDepot={handleSelectDepot}
        />

        {/* Content */}
        {!selectedDepotId ? (
          <View style={styles.centerContent}>
            <Ionicons name="business-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Select a depot to view count history</Text>
          </View>
        ) : isLoading && !isRefetching ? (
          <View style={styles.centerContent}>
            <LoadingDots size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load sessions</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading sessions"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={!!isRefetching}
                onRefresh={refetch}
                tintColor="transparent"
              />
            }
            ListHeaderComponent={<RefreshLoadingDots isRefetching={!!isRefetching} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No completed counts found for this depot</Text>
              </View>
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  containerInner: {
    flex: 1,
  },
  listContent: {
    padding: spacing.base,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  emptyState: {
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Session card
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    height: SESSION_CARD_HEIGHT,
    justifyContent: 'space-between',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  cardCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  cardMetaText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    maxWidth: 120,
  },
  depotCodeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  depotCodeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
});
