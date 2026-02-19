import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { AssetStatus, Asset } from '@rgr/shared';
import { useAssetList } from '../../../hooks/useAssetData';
import { useDebounce } from '../../../hooks/useDebounce';
import { AssetListItem } from '../../../components/assets/AssetListItem';
import { FilterChips } from '../../../components/common/FilterChips';
import { useAuthStore } from '../../../store/authStore';
import { colors } from '../../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../theme/spacing';

// Approximate height calculation for getItemLayout optimization
// padding (16*2) + header/titleRow margin (8) + assetNumber line (~24) +
// description line (~20) + footer line (~18) + marginBottom (12) + border (2)
const ASSET_ITEM_HEIGHT = 132;

export default function AssetListScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [searchInput, setSearchInput] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<AssetStatus[]>([
    'serviced',
    'maintenance',
  ]);

  // Debounce search input to avoid triggering queries on every keystroke
  const debouncedSearch = useDebounce(searchInput, 300);

  const filters: {
    page: number;
    pageSize: number;
    search?: string;
    statuses?: AssetStatus[];
  } = {
    page: 1,
    pageSize: 50,
  };

  if (debouncedSearch) {
    filters.search = debouncedSearch;
  }
  if (selectedStatuses.length > 0) {
    filters.statuses = selectedStatuses;
  }

  const { data, isLoading, error, refetch, isRefetching } = useAssetList(filters);

  const handleToggleStatus = (status: AssetStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleAssetPress = (asset: Asset) => {
    router.push(`/(tabs)/assets/${asset.id}`);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <LinearGradient colors={[...colors.gradientColors]} locations={[...colors.gradientLocations]} start={colors.gradientStart} end={colors.gradientEnd} style={styles.container}>
    <SafeAreaView style={styles.containerInner}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Assets</Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          accessibilityRole="button"
          accessibilityLabel="Logout"
          accessibilityHint="Double tap to sign out of your account"
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by asset number, VIN, or license plate..."
          placeholderTextColor={colors.textSecondary}
          value={searchInput}
          onChangeText={setSearchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityRole="search"
          accessibilityLabel="Search assets"
          accessibilityHint="Search by asset number, VIN, or license plate"
        />
      </View>

      <FilterChips
        selectedStatuses={selectedStatuses}
        onToggleStatus={handleToggleStatus}
      />

      {isLoading && !isRefetching ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.electricBlue} />
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
          data={data?.data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AssetListItem asset={item} onPress={handleAssetPress} />
          )}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerInner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
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
    color: colors.textInverse,
  },
  emptyState: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
});
