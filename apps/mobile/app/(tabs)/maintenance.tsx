import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceListItem as MaintenanceListItemType,
  DefectStatus,
  DefectReportListItem as DefectReportListItemType,
  CreateMaintenanceInput,
} from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../src/theme/spacing';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { SegmentedTabs } from '../../src/components/common/SegmentedTabs';
import {
  MaintenanceListItem,
  MaintenanceFilterPanel,
  DefectFilterPanel,
  CreateMaintenanceModal,
  MaintenanceDetailModal,
  DefectReportListItem,
  DefectReportDetailModal,
  MAINTENANCE_ITEM_HEIGHT,
  DEFECT_ITEM_HEIGHT,
} from '../../src/components/maintenance';
import { useMaintenanceList } from '../../src/hooks/useMaintenanceData';
import { useDefectReportList } from '../../src/hooks/useDefectData';
import { useAcceptDefect } from '../../src/hooks/useAcceptDefect';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';

type ModalState =
  | { type: 'none' }
  | { type: 'defectDetail'; defectId: string }
  | { type: 'acceptDefect'; defectId: string; assetId: string; assetNumber?: string; title: string; description?: string | null }
  | { type: 'maintenanceDetail'; maintenanceId: string }
  | { type: 'createMaintenance' };

// Segment tabs
type TabKey = 'tasks' | 'defects';
const TABS = [
  { key: 'tasks' as const, label: 'Tasks' },
  { key: 'defects' as const, label: 'Defects' },
] as const;

// Default filters: show all (no pre-selection)
const DEFAULT_STATUSES: MaintenanceStatus[] = [];
const DEFAULT_PRIORITIES: MaintenancePriority[] = [];

export default function MaintenanceScreen() {
  const { canMarkMaintenance } = useUserPermissions();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  // Maintenance filter state
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>(DEFAULT_STATUSES);
  const [priorities, setPriorities] = useState<MaintenancePriority[]>(DEFAULT_PRIORITIES);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Defect filter state
  const [defectStatuses, setDefectStatuses] = useState<DefectStatus[]>([]);
  const [defectFiltersExpanded, setDefectFiltersExpanded] = useState(false);

  // Modal state machine — only one modal visible at a time
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const pendingTransition = useRef<ModalState | null>(null);

  const close = useCallback(() => setModal({ type: 'none' }), []);

  /** Close current modal, wait one frame for native unmount, then open next. */
  const transitionTo = useCallback((next: ModalState) => {
    pendingTransition.current = next;
    setModal({ type: 'none' });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pendingTransition.current) {
          setModal(pendingTransition.current);
          pendingTransition.current = null;
        }
      });
    });
  }, []);

  // Accept defect hook (moved up from DefectReportDetailModal)
  const { mutateAsync: acceptDefect } = useAcceptDefect();

  const handleAcceptPress = useCallback((context: {
    defectId: string;
    assetId: string;
    assetNumber?: string;
    title: string;
    description?: string | null;
  }) => {
    transitionTo({ type: 'acceptDefect', ...context });
  }, [transitionTo]);

  const handleViewTaskPress = useCallback((maintenanceId: string) => {
    transitionTo({ type: 'maintenanceDetail', maintenanceId });
  }, [transitionTo]);

  const handleAcceptSubmit = useCallback(async (input: CreateMaintenanceInput) => {
    if (modal.type !== 'acceptDefect') return;
    await acceptDefect({
      defectReportId: modal.defectId,
      maintenanceInput: input,
    });
    close();
  }, [modal, acceptDefect, close]);

  // Fetch maintenance list with filters
  const maintenanceFilters = useMemo(() => ({
    ...(statuses.length > 0 && { status: statuses }),
    ...(priorities.length > 0 && { priority: priorities }),
  }), [statuses, priorities]);

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
  const maintenance = useMemo(
    () => maintenanceData?.pages.flatMap(p => p.data) ?? [],
    [maintenanceData]
  );

  // Fetch defect report list with filters
  const defectFilters = useMemo(() => ({
    ...(defectStatuses.length > 0 && { status: defectStatuses }),
  }), [defectStatuses]);

  const {
    data: defectsData,
    isLoading: isDefectsLoading,
    error: defectsError,
    refetch: refetchDefects,
    fetchNextPage: fetchNextDefectsPage,
    hasNextPage: hasNextDefectsPage,
    isFetchingNextPage: isFetchingNextDefectsPage,
  } = useDefectReportList(defectFilters);

  const defects = useMemo(
    () => defectsData?.pages.flatMap(p => p.data) ?? [],
    [defectsData]
  );

  const handleToggleFilters = useCallback(() => {
    setFiltersExpanded(prev => !prev);
  }, []);

  const handleToggleDefectFilters = useCallback(() => {
    setDefectFiltersExpanded(prev => !prev);
  }, []);

  const handleMaintenancePress = useCallback((item: MaintenanceListItemType) => {
    setModal({ type: 'maintenanceDetail', maintenanceId: item.id });
  }, []);

  const handleDefectPress = useCallback((item: DefectReportListItemType) => {
    setModal({ type: 'defectDetail', defectId: item.id });
  }, []);

  const handleOpenCreate = useCallback(() => {
    setModal({ type: 'createMaintenance' });
  }, []);

  // Maintenance list renderers
  const renderMaintenanceItem = useCallback(({ item }: { item: MaintenanceListItemType }) => (
    <MaintenanceListItem
      maintenance={item}
      onPress={handleMaintenancePress}
    />
  ), [handleMaintenancePress]);

  const maintenanceKeyExtractor = useCallback((item: MaintenanceListItemType) => item.id, []);

  const getMaintenanceItemLayout = useCallback((_: unknown, index: number) => ({
    length: MAINTENANCE_ITEM_HEIGHT,
    offset: MAINTENANCE_ITEM_HEIGHT * index,
    index,
  }), []);

  // Defect list renderers
  const renderDefectItem = useCallback(({ item }: { item: DefectReportListItemType }) => (
    <DefectReportListItem
      defect={item}
      onPress={handleDefectPress}
    />
  ), [handleDefectPress]);

  const defectKeyExtractor = useCallback((item: DefectReportListItemType) => item.id, []);

  const getDefectItemLayout = useCallback((_: unknown, index: number) => ({
    length: DEFECT_ITEM_HEIGHT,
    offset: DEFECT_ITEM_HEIGHT * index,
    index,
  }), []);

  const renderMaintenanceEmpty = () => (
    <View style={styles.centerContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyText}>No maintenance records</Text>
      <Text style={styles.emptySubtext}>
        {canMarkMaintenance ? 'Tap + to schedule maintenance' : 'No scheduled maintenance tasks'}
      </Text>
    </View>
  );

  const renderDefectsEmpty = () => (
    <View style={styles.centerContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark-outline" size={64} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyText}>No defect reports</Text>
      <Text style={styles.emptySubtext}>
        Defects are reported during scanning when issues are found
      </Text>
    </View>
  );

  const isLoading = activeTab === 'tasks' ? isMaintenanceLoading : isDefectsLoading;
  const error = activeTab === 'tasks' ? maintenanceError : defectsError;
  const refetch = activeTab === 'tasks' ? refetchMaintenance : refetchDefects;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        {/* Header */}
        <ScreenHeader
          title="Maintenance"
          rightAction={canMarkMaintenance ? (
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
              <Text style={styles.addLinkText}>New Task</Text>
            </TouchableOpacity>
          ) : undefined}
        />

        {/* Segment tabs */}
        <View style={styles.tabContainer}>
          <SegmentedTabs
            tabs={TABS}
            activeTab={activeTab}
            onTabPress={setActiveTab}
          />
        </View>

        {/* Filters */}
        {activeTab === 'tasks' ? (
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>
              Failed to load {activeTab === 'tasks' ? 'maintenance' : 'defects'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'tasks' ? (
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
            onEndReached={() => {
              if (hasNextMaintenancePage && !isFetchingNextMaintenancePage) {
                fetchNextMaintenancePage();
              }
            }}
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
            onEndReached={() => {
              if (hasNextDefectsPage && !isFetchingNextDefectsPage) {
                fetchNextDefectsPage();
              }
            }}
            onEndReachedThreshold={0.5}
          />
        )}

        {/* Modals — flat siblings, never nested */}
        <DefectReportDetailModal
          visible={modal.type === 'defectDetail'}
          defectId={modal.type === 'defectDetail' ? modal.defectId : null}
          onClose={close}
          onAcceptPress={handleAcceptPress}
          onViewTaskPress={handleViewTaskPress}
        />

        <CreateMaintenanceModal
          visible={modal.type === 'acceptDefect' || modal.type === 'createMaintenance'}
          onClose={close}
          {...(modal.type === 'acceptDefect' ? {
            assetId: modal.assetId,
            assetNumber: modal.assetNumber,
            defectReportId: modal.defectId,
            defaultTitle: modal.title,
            defaultDescription: modal.description ?? undefined,
            defaultPriority: 'high' as const,
            onExternalSubmit: handleAcceptSubmit,
          } : {})}
        />

        <MaintenanceDetailModal
          visible={modal.type === 'maintenanceDetail'}
          maintenanceId={modal.type === 'maintenanceDetail' ? modal.maintenanceId : null}
          onClose={close}
        />
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
    fontFamily: 'Lato_700Bold',
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
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
