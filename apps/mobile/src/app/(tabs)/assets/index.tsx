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
import { AssetListItem } from '../../../components/assets/AssetListItem';
import { FilterChips } from '../../../components/common/FilterChips';
import { useAuthStore } from '../../../store/authStore';
import { colors } from '../../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../theme/spacing';

export default function AssetListScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<AssetStatus[]>([
    'serviced',
    'maintenance',
  ]);

  const { data, isLoading, error, refetch, isRefreshing } = useAssetList({
    search: search || undefined,
    statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    page: 1,
    pageSize: 50,
  });

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
    <LinearGradient colors={[...colors.gradientLight]} style={styles.container}>
    <SafeAreaView style={styles.containerInner}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Assets</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by asset number, VIN, or license plate..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FilterChips
        selectedStatuses={selectedStatuses}
        onToggleStatus={handleToggleStatus}
      />

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.electricBlue} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load assets</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
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
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={colors.electricBlue}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No assets found</Text>
            </View>
          }
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.electricBlue,
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
