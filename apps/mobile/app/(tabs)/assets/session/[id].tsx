import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LoadingDots } from '../../../../src/components/common/LoadingDots';
import { useCountSessionDetail } from '../../../../src/hooks/useCountHistoryData';
import { colors } from '../../../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../../../src/theme/layout';
import type {
  AssetCountSessionStatus,
  AssetCountItemWithAsset,
  CombinationMetadata,
  CombinationPhoto,
} from '@rgr/shared';

const STATUS_LABELS: Record<AssetCountSessionStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ProcessedData {
  standaloneItems: AssetCountItemWithAsset[];
  combinationGroups: Map<string, AssetCountItemWithAsset[]>;
  metadataMap: Map<string, string>;
  photoMap: Map<string, string>;
  totalCombinations: number;
}

const LARGE_STANDALONE_THRESHOLD = 100;

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;

  const { data: detail, isLoading, error, refetch, isRefetching } = useCountSessionDetail(sessionId);

  const processed = useMemo<ProcessedData | null>(() => {
    if (!detail) return null;

    const standaloneItems: AssetCountItemWithAsset[] = [];
    const combinationGroups = new Map<string, AssetCountItemWithAsset[]>();

    for (const item of detail.items) {
      if (item.combinationId) {
        const existing = combinationGroups.get(item.combinationId) ?? [];
        existing.push(item);
        combinationGroups.set(item.combinationId, existing);
      } else {
        standaloneItems.push(item);
      }
    }

    // Sort combination items by position
    for (const [key, items] of combinationGroups) {
      items.sort((a, b) => (a.combinationPosition ?? 0) - (b.combinationPosition ?? 0));
      combinationGroups.set(key, items);
    }

    const metadataMap = new Map<string, string>();
    for (const m of detail.metadata) {
      if (m.notes) metadataMap.set(m.combinationId, m.notes);
    }

    const photoMap = new Map<string, string>();
    for (const p of detail.photos) {
      photoMap.set(p.combinationId, p.photoId);
    }

    return {
      standaloneItems,
      combinationGroups,
      metadataMap,
      photoMap,
      totalCombinations: combinationGroups.size,
    };
  }, [detail]);

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <Header onBack={() => router.back()} />
          <View style={styles.centerContent}>
            <LoadingDots color={colors.electricBlue} size={12} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !detail || !processed) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <Header onBack={() => router.back()} />
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>
              {error ? 'Failed to load session details' : 'Session not found'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const { session } = detail;
  const statusColor = colors.countSessionStatus[session.status] ?? colors.info;
  const statusLabel = STATUS_LABELS[session.status] ?? session.status;
  const useFlatListForStandalone = processed.standaloneItems.length > LARGE_STANDALONE_THRESHOLD;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        {/* Header with depot + date */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {session.depotId ? 'Count Session' : 'Count Session'}
            </Text>
            <Text style={styles.headerDate}>{formatDate(session.startedAt)}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={refetch}
              tintColor={colors.electricBlue}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{session.totalAssetsCounted}</Text>
              <Text style={styles.statLabel}>Total Assets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{processed.standaloneItems.length}</Text>
              <Text style={styles.statLabel}>Standalone</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{processed.totalCombinations}</Text>
              <Text style={styles.statLabel}>Combinations</Text>
            </View>
          </View>

          {/* Session Metadata */}
          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusBadgeText}>{statusLabel}</Text>
              </View>
            </View>
            {session.notes && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Notes</Text>
                <Text style={styles.metadataValue}>{session.notes}</Text>
              </View>
            )}
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Started</Text>
              <Text style={styles.metadataValue}>
                {formatDate(session.startedAt)} at {formatTime(session.startedAt)}
              </Text>
            </View>
            {session.completedAt && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Completed</Text>
                <Text style={styles.metadataValue}>
                  {formatDate(session.completedAt)} at {formatTime(session.completedAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Combinations Section */}
          {processed.totalCombinations > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Combinations</Text>
              {Array.from(processed.combinationGroups.entries()).map(([comboId, items]) => {
                const notes = processed.metadataMap.get(comboId);
                const hasPhoto = processed.photoMap.has(comboId);
                return (
                  <View key={comboId} style={styles.combinationCard}>
                    <View style={styles.combinationHeader}>
                      <Ionicons name="link" size={16} color={colors.electricBlue} />
                      <Text style={styles.combinationText}>
                        {items.map((i) => i.assetNumber ?? '?').join(' + ')}
                      </Text>
                    </View>
                    <View style={styles.combinationStatus}>
                      <View style={styles.statusItem}>
                        <Ionicons
                          name={hasPhoto ? 'checkmark-circle' : 'alert-circle'}
                          size={14}
                          color={hasPhoto ? colors.success : colors.warning}
                        />
                        <Text style={[
                          styles.comboStatusText,
                          !hasPhoto && styles.comboStatusTextWarning,
                        ]}>
                          {hasPhoto ? 'Photo added' : 'No photo'}
                        </Text>
                      </View>
                      <View style={styles.statusItem}>
                        <Ionicons
                          name={notes ? 'checkmark-circle' : 'remove-circle-outline'}
                          size={14}
                          color={notes ? colors.success : colors.textSecondary}
                        />
                        <Text style={styles.comboStatusText}>
                          {notes ? 'Notes added' : 'No notes'}
                        </Text>
                      </View>
                    </View>
                    {notes && (
                      <Text style={styles.combinationNotes} numberOfLines={3}>
                        {notes}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Standalone Assets Section */}
          {processed.standaloneItems.length > 0 && !useFlatListForStandalone && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Standalone Assets</Text>
              <View style={styles.assetGrid}>
                {processed.standaloneItems.map((item) => (
                  <View key={item.id} style={styles.assetChip}>
                    <Text style={styles.assetChipText}>{item.assetNumber ?? '?'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Large standalone list as FlatList for performance */}
        {useFlatListForStandalone && processed.standaloneItems.length > 0 && (
          <View style={styles.flatListSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.base }]}>
              Standalone Assets
            </Text>
            <FlatList
              data={processed.standaloneItems}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={({ item }) => (
                <View style={styles.assetChipFlat}>
                  <Text style={styles.assetChipText}>{item.assetNumber ?? '?'}</Text>
                </View>
              )}
              contentContainerStyle={styles.flatListContent}
              columnWrapperStyle={styles.flatListRow}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ── Header sub-component ──

function Header({ onBack, title, subtitle }: { onBack: () => void; title?: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTextContainer}>
        <Text style={styles.title}>{title ?? 'Count Session'}</Text>
        {subtitle && <Text style={styles.headerDate}>{subtitle}</Text>}
      </View>
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
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: CONTENT_TOP_OFFSET,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerDate: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Metadata
  metadataCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
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

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Combination card
  combinationCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.electricBlue,
    borderWidth: 1,
    borderColor: colors.border,
  },
  combinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  combinationText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  combinationStatus: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  comboStatusText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  comboStatusTextWarning: {
    color: colors.warning,
  },
  combinationNotes: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },

  // Asset grid
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  assetChip: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetChipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },

  // FlatList standalone fallback
  flatListSection: {
    flex: 1,
    paddingTop: spacing.md,
  },
  flatListContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  flatListRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  assetChipFlat: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
});
