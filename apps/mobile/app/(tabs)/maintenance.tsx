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
import type { MaintenanceStatus, MaintenancePriority, MaintenanceListItem as MaintenanceListItemType } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../src/theme/layout';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import {
  MaintenanceListItem,
  MaintenanceFilterPanel,
  CreateMaintenanceModal,
  MaintenanceDetailModal,
  MAINTENANCE_ITEM_HEIGHT,
} from '../../src/components/maintenance';
import { useMaintenanceList } from '../../src/hooks/useMaintenanceData';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';

// Default filters: show scheduled and in_progress
const DEFAULT_STATUSES: MaintenanceStatus[] = ['scheduled', 'in_progress'];
const DEFAULT_PRIORITIES: MaintenancePriority[] = [];

export default function MaintenanceScreen() {
  const { canMarkMaintenance } = useUserPermissions();

  // Filter state
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>(DEFAULT_STATUSES);
  const [priorities, setPriorities] = useState<MaintenancePriority[]>(DEFAULT_PRIORITIES);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Modal state
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);

  // Fetch maintenance list with filters
  const filters = useMemo(() => ({
    status: statuses.length > 0 ? statuses : undefined,
    priority: priorities.length > 0 ? priorities : undefined,
  }), [statuses, priorities]);

  const {
    data: maintenance = [],
    isLoading,
    error,
    refetch,
  } = useMaintenanceList(filters);

  const handleToggleFilters = useCallback(() => {
    setFiltersExpanded(prev => !prev);
  }, []);

  const handleMaintenancePress = useCallback((item: MaintenanceListItemType) => {
    setSelectedMaintenanceId(item.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMaintenanceId(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setIsCreateModalVisible(false);
  }, []);

  const renderItem = useCallback(({ item }: { item: MaintenanceListItemType }) => (
    <MaintenanceListItem
      maintenance={item}
      onPress={handleMaintenancePress}
    />
  ), [handleMaintenancePress]);

  const keyExtractor = useCallback((item: MaintenanceListItemType) => item.id, []);

  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: MAINTENANCE_ITEM_HEIGHT,
    offset: MAINTENANCE_ITEM_HEIGHT * index,
    index,
  }), []);

  const renderEmptyState = () => (
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Maintenance</Text>
              <Text style={styles.subtitle}>Track service and repairs</Text>
            </View>
            {canMarkMaintenance && (
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
            )}
          </View>
        </View>

        {/* Filters */}
        <MaintenanceFilterPanel
          statuses={statuses}
          priorities={priorities}
          onStatusChange={setStatuses}
          onPriorityChange={setPriorities}
          isExpanded={filtersExpanded}
          onToggleExpanded={handleToggleFilters}
        />

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.electricBlue} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load maintenance</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading maintenance"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={maintenance}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={
              maintenance.length === 0 ? styles.emptyListContent : styles.listContent
            }
            ListEmptyComponent={renderEmptyState}
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
          onClose={handleCloseDetail}
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
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: CONTENT_TOP_OFFSET,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
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
});
