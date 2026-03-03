import React, { useState, useCallback, useMemo } from 'react';
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
} from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { SegmentedTabs } from '../../src/components/common/SegmentedTabs';
import {
  MaintenanceListItem,
  MaintenanceFilterPanel,
  CreateMaintenanceModal,
  MaintenanceDetailModal,
  DefectReportListItem,
  DefectReportDetailModal,
  MAINTENANCE_ITEM_HEIGHT,
  DEFECT_ITEM_HEIGHT,
} from '../../src/components/maintenance';
import { useMaintenanceList } from '../../src/hooks/useMaintenanceData';
import { useDefectReportList } from '../../src/hooks/useDefectData';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';

// Segment tabs
type TabKey = 'tasks' | 'defects';
const TABS = [
  { key: 'tasks' as const, label: 'Tasks' },
  { key: 'defects' as const, label: 'Defects' },
] as const;

// Default filters: show scheduled and in_progress
const DEFAULT_STATUSES: MaintenanceStatus[] = ['scheduled', 'in_progress'];
const DEFAULT_PRIORITIES: MaintenancePriority[] = [];

// Defect status filter chips
const DEFECT_STATUS_OPTIONS: { key: DefectStatus; label: string }[] = [
  { key: 'reported', label: 'Reported' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
];

export default function MaintenanceScreen() {
  const { canMarkMaintenance } = useUserPermissions();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  // Maintenance filter state
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>(DEFAULT_STATUSES);
  const [priorities, setPriorities] = useState<MaintenancePriority[]>(DEFAULT_PRIORITIES);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Defect filter state
  const [defectStatuses, setDefectStatuses] = useState<DefectStatus[]>(['reported', 'accepted']);

  // Modal state
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);

  // Fetch maintenance list with filters
  const maintenanceFilters = useMemo(() => ({
    ...(statuses.length > 0 && { status: statuses }),
    ...(priorities.length > 0 && { priority: priorities }),
  }), [statuses, priorities]);

  const {
    data: maintenance = [],
    isLoading: isMaintenanceLoading,
    error: maintenanceError,
    refetch: refetchMaintenance,
  } = useMaintenanceList(maintenanceFilters);

  // Fetch defect report list with filters
  const defectFilters = useMemo(() => ({
    ...(defectStatuses.length > 0 && { status: defectStatuses }),
  }), [defectStatuses]);

  const {
    data: defects = [],
    isLoading: isDefectsLoading,
    error: defectsError,
    refetch: refetchDefects,
  } = useDefectReportList(defectFilters);

  const handleToggleFilters = useCallback(() => {
    setFiltersExpanded(prev => !prev);
  }, []);

  const handleMaintenancePress = useCallback((item: MaintenanceListItemType) => {
    setSelectedMaintenanceId(item.id);
  }, []);

  const handleDefectPress = useCallback((item: DefectReportListItemType) => {
    setSelectedDefectId(item.id);
  }, []);

  const handleCloseMaintenanceDetail = useCallback(() => {
    setSelectedMaintenanceId(null);
  }, []);

  const handleCloseDefectDetail = useCallback(() => {
    setSelectedDefectId(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setIsCreateModalVisible(false);
  }, []);

  const toggleDefectStatus = useCallback((status: DefectStatus) => {
    setDefectStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
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
          subtitle="Track service and repairs"
          rightAction={canMarkMaintenance ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleOpenCreate}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Create maintenance record"
              accessibilityHint="Double tap to schedule new maintenance"
            >
              <Ionicons name="add" size={24} color={colors.textInverse} />
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
          <View style={styles.defectFilterRow}>
            {DEFECT_STATUS_OPTIONS.map((opt) => {
              const active = defectStatuses.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => toggleDefectStatus(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Filter by ${opt.label}`}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.electricBlue} size={12} />
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
          />
        )}

        {/* Modals */}
        <CreateMaintenanceModal
          visible={isCreateModalVisible}
          onClose={handleCloseCreate}
        />

        <MaintenanceDetailModal
          visible={selectedMaintenanceId !== null}
          maintenanceId={selectedMaintenanceId}
          onClose={handleCloseMaintenanceDetail}
        />

        <DefectReportDetailModal
          visible={selectedDefectId !== null}
          defectId={selectedDefectId}
          onClose={handleCloseDefectDetail}
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
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
    fontWeight: fontWeight.semibold,
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
  defectFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.electricBlue,
    borderColor: colors.electricBlue,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
});
