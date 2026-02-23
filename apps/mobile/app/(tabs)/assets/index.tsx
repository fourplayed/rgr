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
import { useRouter } from 'expo-router';
import type { AssetStatus, AssetCategory, AssetWithRelations } from '@rgr/shared';
import { useAssetList, useDepots } from '../../../src/hooks/useAssetData';
import { useDebounce } from '../../../src/hooks/useDebounce';
import { AssetListItem } from '../../../src/components/assets/AssetListItem';
import { AssetFilterPanel } from '../../../src/components/assets/AssetFilterPanel';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../../src/theme/layout';

/**
 * Fixed height for FlatList optimization (getItemLayout)
 * Must match AssetListItem rendered height:
 * - Container padding: 16 * 2 = 32px
 * - Card content height: 48px (icon + text)
 * - Container marginBottom: 8px (spacing.sm)
 * - Border: 2px (top + bottom)
 * Total: 32 + 48 + 8 = 88px
 *
 * If AssetListItem styles change, this must be updated to match!
 * See: src/components/assets/AssetListItem.tsx
 */
const ASSET_ITEM_HEIGHT = 88;

interface AssetFilters {
  statuses: AssetStatus[];
  categories: AssetCategory[];
  subtypes: string[];
  depotIds: string[];
}

export default function AssetListScreen() {
  const router = useRouter();
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

  // Fetch depots for filter panel
  const { data: depots = [] } = useDepots();

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
    <AssetListItem asset={item} onPress={handleAssetPress} />
  ), [handleAssetPress]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.header}>
          <Text style={styles.title}>Fleet Assets</Text>
        </View>

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

      {isLoading && !isRefetching ? (
        <View style={styles.centerContent}>
          <LoadingDots color={colors.electricBlue} size={12} />
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
          keyExtractor={(item) => item.id}
          renderItem={renderAssetItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={refetch}
              tintColor={colors.electricBlue}
            />
          }
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
    backgroundColor: '#E8E8E8',
  },
  containerInner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: CONTENT_TOP_OFFSET,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
