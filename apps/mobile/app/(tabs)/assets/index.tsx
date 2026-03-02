import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from '../../../src/components/common/LoadingDots';
import { RefreshLoadingDots } from '../../../src/components/common/RefreshLoadingDots';
import { ScreenHeader } from '../../../src/components/common/ScreenHeader';
import { useRouter } from 'expo-router';
import type { AssetStatus, AssetCategory, AssetWithRelations } from '@rgr/shared';
import { useAssetList, useDepots } from '../../../src/hooks/useAssetData';
import { useDepotLookup } from '../../../src/hooks/useDepots';
import { useDebounce } from '../../../src/hooks/useDebounce';
import { AssetListItem } from '../../../src/components/assets/AssetListItem';
import { AssetFilterPanel } from '../../../src/components/assets/AssetFilterPanel';
import { useUserPermissions } from '../../../src/contexts/UserPermissionsContext';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../src/theme/spacing';

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
  const { canPerformAssetCount } = useUserPermissions();
  const [searchInput, setSearchInput] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filters, setFilters] = useState<AssetFilters>({
    statuses: ['serviced', 'maintenance'],
    categories: [],
    subtypes: [],
    depotIds: [],
  });

  // Debounce search input to avoid triggering queries on every keystroke
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fetch depots for filter panel and list item display
  const { data: depots = [], isLoading: isDepotsLoading } = useDepots();
  const depotLookup = useDepotLookup();

  // Build query filters
  const queryFilters: {
    page: number;
    pageSize: number;
    search?: string;
    statuses?: AssetStatus[];
    categories?: AssetCategory[];
    depotIds?: string[];
  } = {
    page: 1,
    pageSize: 50,
  };

  if (debouncedSearch) {
    queryFilters.search = debouncedSearch;
  }
  if (filters.statuses.length > 0) {
    queryFilters.statuses = filters.statuses;
  }
  if (filters.categories.length > 0) {
    queryFilters.categories = filters.categories;
  }
  if (filters.depotIds.length > 0) {
    queryFilters.depotIds = filters.depotIds;
  }

  const { data, isLoading, error, refetch, isRefetching } = useAssetList(queryFilters);

  // Client-side subtype filtering (if backend doesn't support it)
  const filteredAssets = React.useMemo(() => {
    if (!data?.data) return [];
    if (filters.subtypes.length === 0) return data.data;

    return data.data.filter((asset) => {
      if (!asset.subtype) return false;
      return filters.subtypes.some((subtype) =>
        asset.subtype?.toLowerCase().includes(subtype.toLowerCase())
      );
    });
  }, [data?.data, filters.subtypes]);

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

  const handleAssetPress = useCallback((asset: AssetWithRelations) => {
    router.push(`/(tabs)/assets/${asset.id}`);
  }, [router]);

  // Memoized toggle callback
  const handleToggleExpanded = useCallback(() => {
    setIsFilterExpanded((prev) => !prev);
  }, []);

  // Memoized renderItem for FlatList - critical for list performance
  const renderAssetItem = useCallback(({ item }: { item: AssetWithRelations }) => (
    <AssetListItem asset={item} onPress={handleAssetPress} depotLookup={depotLookup} />
  ), [handleAssetPress, depotLookup]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <ScreenHeader
          title="Fleet Assets"
          compact
          rightAction={canPerformAssetCount ? (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push('/(tabs)/assets/count-history')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Count History"
              accessibilityHint="View past count sessions"
            >
              <Ionicons name="clipboard-outline" size={18} color={colors.electricBlue} />
              <Text style={styles.historyButtonText}>Count History</Text>
            </TouchableOpacity>
          ) : undefined}
        />

        <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, !searchInput && styles.searchInputPlaceholder]}
            placeholder="Search by Asset ID, Sub-Type, Location..."
            placeholderTextColor={colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityRole="search"
            accessibilityLabel="Search assets"
            accessibilityHint="Search by Asset ID, Sub-Type, or Location"
          />
        </View>
      </View>

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
      />

      {(isLoading || isDepotsLoading) && !isRefetching ? (
        <View style={styles.centerContent}>
          <LoadingDots size={12} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load assets</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading assets"
            accessibilityHint="Double tap to try loading the asset list again"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No assets found</Text>
            </View>
          }
          getItemLayout={(data, index) => ({
            length: ASSET_ITEM_HEIGHT,
            offset: ASSET_ITEM_HEIGHT * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
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
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  historyButtonText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  searchInputPlaceholder: {
    fontFamily: 'Lato_400Regular_Italic',
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
    fontFamily: 'Lato_400Regular',
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
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  emptyState: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
