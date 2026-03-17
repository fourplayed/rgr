import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from '../../../src/components/common/LoadingDots';
import { RefreshLoadingDots } from '../../../src/components/common/RefreshLoadingDots';
import { ScreenHeader } from '../../../src/components/common/ScreenHeader';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { PersistentBackdrop } from '../../../src/components/common/PersistentBackdrop';
import { CreateAssetModal } from '../../../src/components/assets/CreateAssetModal';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { AssetStatus, AssetCategory, AssetWithRelations } from '@rgr/shared';
import { useInfiniteAssetList, useDepots } from '../../../src/hooks/useAssetData';
import { useDepotLookup } from '../../../src/hooks/useDepots';
import { useDebounce } from '../../../src/hooks/useDebounce';
import { useUserPermissions } from '../../../src/contexts/UserPermissionsContext';
import { useModalTransition } from '../../../src/hooks/useModalTransition';
import { usePersistentBackdrop } from '../../../src/hooks/usePersistentBackdrop';
import { AssetListItem } from '../../../src/components/assets/AssetListItem';
import { AssetFilterPanel } from '../../../src/components/assets/AssetFilterPanel';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../../src/theme/spacing';
import { AppText } from '../../../src/components/common';

const EMPTY_FILTERS: AssetFilters = {
  statuses: [],
  categories: [],
  subtypes: [],
  depotIds: [],
};

/**
 * Fixed height for FlatList optimization (getItemLayout)
 * Must match AssetListItem rendered height:
 * - Container padding: 12 * 2 = 24px (spacing.md)
 * - Card content height: 48px (icon + text)
 * - Container marginBottom: 8px (spacing.sm)
 * Total: 24 + 48 + 8 = 80px
 *
 * If AssetListItem styles change, this must be updated to match!
 * See: src/components/assets/AssetListItem.tsx
 */
const ASSET_ITEM_HEIGHT = 80;

interface AssetFilters {
  statuses: AssetStatus[];
  categories: AssetCategory[];
  subtypes: string[];
  depotIds: string[];
}

export default function AssetListScreen() {
  const router = useRouter();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [searchInput, setSearchInput] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filters, setFilters] = useState<AssetFilters>(EMPTY_FILTERS);

  // Modal + permission state
  type ModalState = { type: 'none' } | { type: 'createAsset' };

  const { canAccessAdmin } = useUserPermissions();
  const { modal, closeModal, transitionTo, isTransitioning, handleExitComplete } =
    useModalTransition<ModalState>({ type: 'none' });
  const {
    backdropOpacity,
    showBackdrop,
    mounted: backdropMounted,
  } = usePersistentBackdrop(modal.type !== 'none' || isTransitioning);

  const handleOpenCreate = useCallback(() => {
    transitionTo({ type: 'createAsset' });
  }, [transitionTo]);

  // Apply status filter from route params (e.g. navigating from dashboard stat card)
  useEffect(() => {
    if (status && ['serviced', 'maintenance', 'out_of_service'].includes(status)) {
      setFilters((prev) => ({ ...prev, statuses: [status as AssetStatus] }));
      router.setParams({ status: undefined });
    }
  }, [status, router]);

  // Debounce search input to avoid triggering queries on every keystroke
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fetch depots for filter panel and list item display
  const { data: depots = [], isLoading: isDepotsLoading } = useDepots();
  const depotLookup = useDepotLookup();

  // Build query filters for cursor-based infinite list
  const queryFilters = React.useMemo(() => {
    const f: {
      pageSize?: number;
      search?: string;
      statuses?: AssetStatus[];
      categories?: AssetCategory[];
      depotIds?: string[];
    } = { pageSize: 30 };

    if (debouncedSearch) f.search = debouncedSearch;
    if (filters.statuses.length > 0) f.statuses = filters.statuses;
    if (filters.categories.length > 0) f.categories = filters.categories;
    if (filters.depotIds.length > 0) f.depotIds = filters.depotIds;

    return f;
  }, [debouncedSearch, filters.statuses, filters.categories, filters.depotIds]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAssetList(queryFilters);

  // Flatten pages into single array
  const allAssets = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages]
  );

  // Client-side subtype filtering (if backend doesn't support it)
  const filteredAssets = React.useMemo(() => {
    if (filters.subtypes.length === 0) return allAssets;

    return allAssets.filter((asset) => {
      if (!asset.subtype) return false;
      return filters.subtypes.some((subtype) =>
        asset.subtype?.toLowerCase().includes(subtype.toLowerCase())
      );
    });
  }, [allAssets, filters.subtypes]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Memoized callbacks to prevent unnecessary re-renders of AssetFilterPanel
  const handleStatusChange = useCallback((statuses: AssetStatus[]) => {
    setFilters((prev) => ({ ...prev, statuses }));
  }, []);

  const handleCategoryChange = useCallback((categories: AssetCategory[]) => {
    setFilters((prev) => ({ ...prev, categories, subtypes: [] }));
  }, []);

  const handleSubtypeChange = useCallback((subtypes: string[]) => {
    setFilters((prev) => ({ ...prev, subtypes }));
  }, []);

  const handleDepotChange = useCallback((depotIds: string[]) => {
    setFilters((prev) => ({ ...prev, depotIds }));
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const handleAssetPress = useCallback(
    (asset: AssetWithRelations) => {
      router.push(`/(tabs)/assets/${asset.id}`);
    },
    [router]
  );

  // Memoized toggle callback
  const handleToggleExpanded = useCallback(() => {
    setIsFilterExpanded((prev) => !prev);
  }, []);

  // Memoized getItemLayout for FlatList optimization
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ASSET_ITEM_HEIGHT,
      offset: ASSET_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Memoized renderItem for FlatList - critical for list performance
  const renderAssetItem = useCallback(
    ({ item }: { item: AssetWithRelations }) => (
      <AssetListItem asset={item} onPress={handleAssetPress} depotLookup={depotLookup} />
    ),
    [handleAssetPress, depotLookup]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <ScreenHeader
          title="Fleet Assets"
          compact
          rightAction={
            canAccessAdmin ? (
              <TouchableOpacity
                style={styles.addLink}
                onPress={handleOpenCreate}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Create new asset"
                accessibilityHint="Double tap to add a new fleet asset"
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.electricBlue} />
                <AppText style={styles.addLinkText}>New Asset</AppText>
              </TouchableOpacity>
            ) : undefined
          }
        />

        <AssetFilterPanel
          statuses={filters.statuses}
          categories={filters.categories}
          subtypes={filters.subtypes}
          depotIds={filters.depotIds}
          depots={depots}
          onStatusChange={handleStatusChange}
          onCategoryChange={handleCategoryChange}
          onSubtypeChange={handleSubtypeChange}
          onDepotChange={handleDepotChange}
          isExpanded={isFilterExpanded}
          onToggleExpanded={handleToggleExpanded}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onClearAll={handleClearAll}
        />

        {(isLoading || isDepotsLoading) && !isRefetching ? (
          <View style={styles.centerContent}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <AppText style={styles.errorText}>Failed to load assets</AppText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading assets"
              accessibilityHint="Double tap to try loading the asset list again"
            >
              <AppText style={styles.retryButtonText}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredAssets}
            extraData={depotLookup}
            keyExtractor={(item) => item.id}
            renderItem={renderAssetItem}
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
              <EmptyState
                icon="cube-outline"
                title="No assets found"
                subtitle="Try adjusting your search or filters"
              />
            }
            getItemLayout={getItemLayout}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
          />
        )}
      </SafeAreaView>

      <PersistentBackdrop
        opacity={backdropOpacity}
        showBackdrop={showBackdrop}
        mounted={backdropMounted}
        onPress={closeModal}
      />
      <CreateAssetModal
        visible={modal.type === 'createAsset'}
        onClose={closeModal}
        noBackdrop
        onExitComplete={handleExitComplete}
      />
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
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
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
    fontFamily: fonts.bold,
    color: colors.textInverse,
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
});
