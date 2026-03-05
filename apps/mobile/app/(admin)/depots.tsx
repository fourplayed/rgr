import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Depot, CreateDepotInput, UpdateDepotInput } from '@rgr/shared';
import {
  useAllDepots,
  useCreateDepot,
  useUpdateDepot,
  useDeleteDepot,
} from '../../src/hooks/useAdminDepots';
import { DepotListItem, DEPOT_ITEM_HEIGHT } from '../../src/components/admin/DepotListItem';
import { DepotFormSheet } from '../../src/components/admin/DepotFormSheet';
import { ConfirmSheet } from '../../src/components/common/ConfirmSheet';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../src/theme/spacing';

export default function DepotsScreen() {
  const router = useRouter();
  const { data: depots, isLoading, error, refetch } = useAllDepots();
  const createMutation = useCreateDepot();
  const updateMutation = useUpdateDepot();
  const deleteMutation = useDeleteDepot();

  const [showForm, setShowForm] = useState(false);
  const [editingDepot, setEditingDepot] = useState<Depot | null>(null);
  const [deletingDepot, setDeletingDepot] = useState<Depot | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDepotPress = useCallback((depot: Depot) => {
    setEditingDepot(depot);
    setShowForm(true);
  }, []);

  const handleDepotLongPress = useCallback((depot: Depot) => {
    setDeleteError(null);
    setDeletingDepot(depot);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingDepot(null);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (input: CreateDepotInput | UpdateDepotInput) => {
      if (editingDepot) {
        await updateMutation.mutateAsync(
          { id: editingDepot.id, input: input as UpdateDepotInput },
        );
      } else {
        await createMutation.mutateAsync(input as CreateDepotInput);
      }
      setShowForm(false);
    },
    [editingDepot, updateMutation, createMutation]
  );

  const handleDelete = useCallback(() => {
    if (!deletingDepot) return;
    deleteMutation.mutate(deletingDepot.id, {
      onSuccess: () => {
        setDeletingDepot(null);
        setDeleteError(null);
      },
      onError: (err) => {
        setDeleteError(err.message);
      },
    });
  }, [deletingDepot, deleteMutation]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: DEPOT_ITEM_HEIGHT + spacing.sm,
      offset: (DEPOT_ITEM_HEIGHT + spacing.sm) * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Depot) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Depot }) => (
      <DepotListItem
        depot={item}
        onPress={handleDepotPress}
        onLongPress={handleDepotLongPress}
      />
    ),
    [handleDepotPress, handleDepotLongPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyText}>No depots</Text>
        <Text style={styles.emptySubtext}>Tap + to create one</Text>
      </View>
    ),
    []
  );

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Depots</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreate}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create depot"
          >
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={12} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Failed to load depots</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={depots ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            ListEmptyComponent={renderEmpty}
            removeClippedSubviews
            contentContainerStyle={
              (depots?.length ?? 0) === 0
                ? styles.emptyListContent
                : styles.listContent
            }
          />
        )}

        <DepotFormSheet
          visible={showForm}
          depot={editingDepot}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <ConfirmSheet
          visible={!!deletingDepot}
          type="danger"
          title="Delete Depot"
          message={
            deleteError
              ? deleteError
              : `Are you sure you want to delete "${deletingDepot?.name}"? This cannot be undone.`
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => {
            setDeletingDepot(null);
            setDeleteError(null);
          }}
          isLoading={deleteMutation.isPending}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryButton: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  emptyListContent: {
    flex: 1,
  },
});
