import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceListItem as MaintenanceListItemType,
  DefectStatus,
  DefectReportListItem as DefectReportListItemType,
} from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { SegmentedTabs } from '../../src/components/common/SegmentedTabs';
import { EmptyState } from '../../src/components/common/EmptyState';
import {
  MaintenanceListItem,
  MaintenanceFilterPanel,
  DefectFilterPanel,
  CreateMaintenanceModal,
  DefectReportListItem,
  MAINTENANCE_ITEM_HEIGHT,
  DEFECT_ITEM_HEIGHT,
} from '../../src/components/maintenance';
import { BulkActionBar } from '../../src/components/maintenance/BulkActionBar';
import { useMaintenanceList } from '../../src/hooks/useMaintenanceData';
import { useDefectReportList } from '../../src/hooks/useDefectData';
import { useDefectMaintenanceModals } from '../../src/hooks/useDefectMaintenanceModals';
import { useMaintenanceSelection } from '../../src/hooks/useMaintenanceSelection';
import { useBulkCompleteMaintenance } from '../../src/hooks/useBulkCompleteMaintenance';
import { DefectMaintenanceModals } from '../../src/components/common/DefectMaintenanceModals';
import { useTabFade } from '../../src/hooks/useTabFade';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { AppText } from '../../src/components/common';

// Segment tabs
type TabKey = 'tasks' | 'defects';
const TABS = [
  { key: 'tasks' as const, label: 'Tasks' },
  { key: 'defects' as const, label: 'Defects' },
] as const;

// Default filters: show all non-cancelled/non-dismissed items without requiring client-side filter
const DEFAULT_STATUSES: MaintenanceStatus[] = [];
const DEFAULT_PRIORITIES: MaintenancePriority[] = [];
// Statuses to fetch when no user filter is active — excludes cancelled at the query level
const ACTIVE_MAINTENANCE_STATUSES: MaintenanceStatus[] = ['scheduled', 'in_progress', 'completed'];
// Defect statuses to fetch when no user filter is active — excludes dismissed at the query level
const ACTIVE_DEFECT_STATUSES: DefectStatus[] = ['reported', 'task_created', 'resolved'];

export default function MaintenanceScreen() {
  const router = useRouter();
  const { canMarkMaintenance } = useUserPermissions();
  const { tab, defectStatus } = useLocalSearchParams<{ tab?: string; defectStatus?: string }>();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');
  const { opacity: tabOpacity, visibleTab } = useTabFade(activeTab);

  // Maintenance filter state
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>(DEFAULT_STATUSES);
  const [priorities, setPriorities] = useState<MaintenancePriority[]>(DEFAULT_PRIORITIES);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Defect filter state
  const [defectStatuses, setDefectStatuses] = useState<DefectStatus[]>([]);
  const [defectFiltersExpanded, setDefectFiltersExpanded] = useState(false);

  // Apply tab/filter from route params (e.g. navigating from dashboard stat card)
  useEffect(() => {
    if (tab === 'defects') {
      setActiveTab('defects');
    }
    if (defectStatus === 'reported') {
      setDefectStatuses(['reported']);
    }
    if (tab || defectStatus) {
      router.setParams({ tab: undefined, defectStatus: undefined });
    }
  }, [tab, defectStatus, router]);

  // Shared defect/maintenance modal chain (detail -> accept -> task detail)
  const modals = useDefectMaintenanceModals();

  // Standalone "create maintenance" state — separate from the defect chain
  const [showCreateMaintenance, setShowCreateMaintenance] = useState(false);

  // Fetch maintenance list with filters — always exclude cancelled at the query level
  const maintenanceFilters = useMemo(
    () => ({
      // When the user has selected specific statuses, use those; otherwise fetch all active statuses
      status: statuses.length > 0 ? statuses : ACTIVE_MAINTENANCE_STATUSES,
      ...(priorities.length > 0 && { priority: priorities }),
    }),
    [statuses, priorities]
  );

  const {
    data: maintenanceData,
    isLoading: isMaintenanceLoading,
    error: maintenanceError,
    refetch: refetchMaintenance,
    fetchNextPage: fetchNextMaintenancePage,
    hasNextPage: hasNextMaintenancePage,
    isFetchingNextPage: isFetchingNextMaintenancePage,
  } = useMaintenanceList(maintenanceFilters);

  // Flatten infinite query pages into a single array for FlatList
  // (cancelled items are excluded at the query level via maintenanceFilters.status)
  const maintenance = useMemo(
    () => maintenanceData?.pages.flatMap((p) => p.data) ?? [],
    [maintenanceData]
  );

  // Bulk selection and completion
  const selection = useMaintenanceSelection(maintenance);
  const { bulkComplete, isProcessing, progress } = useBulkCompleteMaintenance();

  const handleLongPress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      selection.enterSelection(id);
    },
    [selection]
  );

  const handleBulkComplete = useCallback(async () => {
    const ids = Array.from(selection.selectedIds);
    await bulkComplete(ids);
    selection.exitSelection();
  }, [selection, bulkComplete]);

  // Fetch defect report list with filters — always exclude dismissed at the query level
  const defectFilters = useMemo(
    () => ({
      // When the user has selected specific statuses, use those; otherwise fetch all active statuses
      status: defectStatuses.length > 0 ? defectStatuses : ACTIVE_DEFECT_STATUSES,
    }),
    [defectStatuses]
  );

  const {
    data: defectsData,
    isLoading: isDefectsLoading,
    error: defectsError,
    refetch: refetchDefects,
    fetchNextPage: fetchNextDefectsPage,
    hasNextPage: hasNextDefectsPage,
    isFetchingNextPage: isFetchingNextDefectsPage,
  } = useDefectReportList(defectFilters);

  // (dismissed items are excluded at the query level via defectFilters.status)
  const defects = useMemo(() => defectsData?.pages.flatMap((p) => p.data) ?? [], [defectsData]);

  const handleToggleFilters = useCallback(() => {
    setFiltersExpanded((prev) => !prev);
  }, []);

  const handleToggleDefectFilters = useCallback(() => {
    setDefectFiltersExpanded((prev) => !prev);
  }, []);

  const { openMaintenanceDetail, openDefectDetail } = modals;

  const handleMaintenanceEndReached = useCallback(() => {
    if (hasNextMaintenancePage && !isFetchingNextMaintenancePage) {
      fetchNextMaintenancePage();
    }
  }, [hasNextMaintenancePage, isFetchingNextMaintenancePage, fetchNextMaintenancePage]);

  const handleDefectEndReached = useCallback(() => {
    if (hasNextDefectsPage && !isFetchingNextDefectsPage) {
      fetchNextDefectsPage();
    }
  }, [hasNextDefectsPage, isFetchingNextDefectsPage, fetchNextDefectsPage]);

  const handleMaintenancePress = useCallback(
    (item: MaintenanceListItemType) => {
      openMaintenanceDetail(item.id);
    },
    [openMaintenanceDetail]
  );

  const handleDefectPress = useCallback(
    (item: DefectReportListItemType) => {
      openDefectDetail(item.id);
    },
    [openDefectDetail]
  );

  const handleOpenCreate = useCallback(() => {
    setShowCreateMaintenance(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setShowCreateMaintenance(false);
  }, []);

  // Maintenance list renderers
  const renderMaintenanceItem = useCallback(
    ({ item }: { item: MaintenanceListItemType }) => (
      <MaintenanceListItem
        maintenance={item}
        onPress={
          selection.isSelecting ? () => selection.toggleItem(item.id) : handleMaintenancePress
        }
        isSelecting={selection.isSelecting}
        isSelected={selection.selectedIds.has(item.id)}
        isCompletable={selection.isCompletable(item.id)}
        onLongPress={handleLongPress}
      />
    ),
    [handleMaintenancePress, selection, handleLongPress]
  );

  const maintenanceKeyExtractor = useCallback((item: MaintenanceListItemType) => item.id, []);

  const getMaintenanceItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: MAINTENANCE_ITEM_HEIGHT,
      offset: MAINTENANCE_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Defect list renderers
  const renderDefectItem = useCallback(
    ({ item }: { item: DefectReportListItemType }) => (
      <DefectReportListItem defect={item} onPress={handleDefectPress} />
    ),
    [handleDefectPress]
  );

  const defectKeyExtractor = useCallback((item: DefectReportListItemType) => item.id, []);

  const getDefectItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: DEFECT_ITEM_HEIGHT,
      offset: DEFECT_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderMaintenanceEmpty = useCallback(
    () => (
      <EmptyState
        icon="construct-outline"
        title="No maintenance records"
        subtitle={
          canMarkMaintenance ? 'Tap + to schedule maintenance' : 'No scheduled maintenance tasks'
        }
      />
    ),
    [canMarkMaintenance]
  );

  const renderDefectsEmpty = useCallback(
    () => (
      <EmptyState
        icon="warning-outline"
        title="No defect reports"
        subtitle="Defects are reported during scanning when issues are found"
      />
    ),
    []
  );

  const isLoading = visibleTab === 'tasks' ? isMaintenanceLoading : isDefectsLoading;
  const error = visibleTab === 'tasks' ? maintenanceError : defectsError;
  const refetch = visibleTab === 'tasks' ? refetchMaintenance : refetchDefects;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        {/* Header */}
        <ScreenHeader
          title="Maintenance"
          rightAction={
            selection.isSelecting ? (
              <View style={styles.selectionHeader}>
                <AppText style={styles.selectionCount}>{selection.selectedCount} selected</AppText>
                <TouchableOpacity
                  onPress={selection.selectAll}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Select all completable items"
                >
                  <AppText style={styles.selectAllText}>All</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={selection.exitSelection}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Exit selection mode"
                >
                  <AppText style={styles.doneText}>Done</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.headerActions}>
                {visibleTab === 'tasks' && maintenance.length > 0 && canMarkMaintenance && (
                  <TouchableOpacity
                    onPress={() => {
                      const first = maintenance.find((m) =>
                        ['scheduled', 'in_progress'].includes(m.status)
                      );
                      if (first) selection.enterSelection(first.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Enter selection mode"
                  >
                    <AppText style={styles.selectButtonText}>Select</AppText>
                  </TouchableOpacity>
                )}
                {canMarkMaintenance && (
                  <TouchableOpacity
                    style={styles.addLink}
                    onPress={handleOpenCreate}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Create maintenance record"
                    accessibilityHint="Double tap to schedule new maintenance"
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.electricBlue} />
                    <AppText style={styles.addLinkText}>New Task</AppText>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />

        {/* Segment tabs */}
        <View style={styles.tabContainer}>
          <SegmentedTabs tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />
        </View>

        {/* Filters */}
        {visibleTab === 'tasks' ? (
          <MaintenanceFilterPanel
            statuses={statuses}
            priorities={priorities}
            onStatusChange={setStatuses}
            onPriorityChange={setPriorities}
            isExpanded={filtersExpanded}
            onToggleExpanded={handleToggleFilters}
          />
        ) : (
          <DefectFilterPanel
            statuses={defectStatuses}
            onStatusChange={setDefectStatuses}
            isExpanded={defectFiltersExpanded}
            onToggleExpanded={handleToggleDefectFilters}
          />
        )}

        {/* Content */}
        <Animated.View style={[{ flex: 1 }, { opacity: tabOpacity }]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingDots color={colors.textSecondary} size={12} />
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <AppText style={styles.errorText}>
                Failed to load {visibleTab === 'tasks' ? 'maintenance' : 'defects'}
              </AppText>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetch()}
                accessibilityRole="button"
                accessibilityLabel="Retry loading"
              >
                <AppText style={styles.retryButtonText}>Retry</AppText>
              </TouchableOpacity>
            </View>
          ) : visibleTab === 'tasks' ? (
            <FlatList
              data={maintenance}
              renderItem={renderMaintenanceItem}
              keyExtractor={maintenanceKeyExtractor}
              getItemLayout={getMaintenanceItemLayout}
              contentContainerStyle={
                maintenance.length === 0 ? styles.emptyListContent : styles.listContent
              }
              ListEmptyComponent={renderMaintenanceEmpty}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              onEndReached={handleMaintenanceEndReached}
              onEndReachedThreshold={0.5}
            />
          ) : (
            <FlatList
              data={defects}
              renderItem={renderDefectItem}
              keyExtractor={defectKeyExtractor}
              getItemLayout={getDefectItemLayout}
              contentContainerStyle={
                defects.length === 0 ? styles.emptyListContent : styles.listContent
              }
              ListEmptyComponent={renderDefectsEmpty}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              onEndReached={handleDefectEndReached}
              onEndReachedThreshold={0.5}
            />
          )}
        </Animated.View>

        {/* Bulk action bar — visible when in selection mode on tasks tab */}
        {selection.isSelecting && (
          <BulkActionBar
            selectedCount={selection.selectedCount}
            onComplete={handleBulkComplete}
            onCancel={selection.exitSelection}
            isProcessing={isProcessing}
            progress={progress}
          />
        )}

        {/* Shared defect/maintenance modal chain */}
        <DefectMaintenanceModals {...modals} />

        {/* Standalone "create maintenance" modal — separate from defect chain */}
        <CreateMaintenanceModal visible={showCreateMaintenance} onClose={handleCloseCreate} />
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
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
  },
  tabContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  emptyListContent: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.error,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectionCount: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  selectAllText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  doneText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
  },
});
