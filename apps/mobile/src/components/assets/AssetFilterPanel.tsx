import React, { useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AssetStatus, AssetCategory, Depot } from '@rgr/shared';
import {
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategoryLabels,
  AssetSubtypesByCategory,
} from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';
import { DEPOT_ORDER, getDepotColor, getDepotTextColor } from '../../utils/depotDisplay';
import { FilterChip } from '../common/FilterChip';
import { AppText } from '../common';

// Category-specific colors for Asset Type filter chips
const CATEGORY_COLORS: Record<AssetCategory, string> = {
  trailer: '#8B5CF6', // Violet
  dolly: colors.categoryDolly, // Cyan
};

// Section accent colors (left border strip)
const SECTION_ACCENTS = {
  assetType: '#8B5CF6',
  subType: colors.electricBlue,
  location: colors.electricBlue,
  status: colors.status.maintenance,
};

const SPRING_CONFIG = { damping: 22, stiffness: 220 };

interface AssetFilterPanelProps {
  statuses: AssetStatus[];
  categories: AssetCategory[];
  subtypes: string[];
  depotIds: string[];
  depots: Depot[];
  onStatusChange: (statuses: AssetStatus[]) => void;
  onCategoryChange: (categories: AssetCategory[]) => void;
  onSubtypeChange: (subtypes: string[]) => void;
  onDepotChange: (depotIds: string[]) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  searchValue: string;
  onSearchChange: (text: string) => void;
  onClearAll: () => void;
}

export const AssetFilterPanel = memo(function AssetFilterPanel({
  statuses,
  categories,
  subtypes,
  depotIds,
  depots,
  onStatusChange,
  onCategoryChange,
  onSubtypeChange,
  onDepotChange,
  isExpanded,
  onToggleExpanded,
  searchValue,
  onSearchChange,
  onClearAll,
}: AssetFilterPanelProps) {
  // ── Animations ──
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);

  React.useEffect(() => {
    expandProgress.value = withSpring(isExpanded ? 1 : 0, SPRING_CONFIG);
  }, [isExpanded, expandProgress]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${expandProgress.value * 180}deg` }],
  }));

  // ── Toggle callbacks ──
  const handleToggle = useCallback(() => {
    Haptics.selectionAsync();
    onToggleExpanded();
  }, [onToggleExpanded]);

  const toggleStatus = useCallback(
    (status: AssetStatus) => {
      if (statuses.includes(status)) {
        onStatusChange(statuses.filter((s) => s !== status));
      } else {
        onStatusChange([...statuses, status]);
      }
    },
    [statuses, onStatusChange]
  );

  const toggleCategory = useCallback(
    (category: AssetCategory) => {
      if (categories.includes(category)) {
        const newCategories = categories.filter((c) => c !== category);
        onCategoryChange(newCategories);
        const validSubtypes = new Set(
          newCategories.flatMap((c) => [...AssetSubtypesByCategory[c]])
        );
        const filtered = subtypes.filter((s) => validSubtypes.has(s));
        if (filtered.length !== subtypes.length) {
          onSubtypeChange(filtered);
        }
      } else {
        const newCategories = [...categories, category];
        onCategoryChange(newCategories);
        const validSubtypes = new Set(
          newCategories.flatMap((c) => [...AssetSubtypesByCategory[c]])
        );
        const filtered = subtypes.filter((s) => validSubtypes.has(s));
        if (filtered.length !== subtypes.length) {
          onSubtypeChange(filtered);
        }
      }
    },
    [categories, subtypes, onCategoryChange, onSubtypeChange]
  );

  const toggleSubtype = useCallback(
    (subtype: string) => {
      if (subtypes.includes(subtype)) {
        onSubtypeChange(subtypes.filter((s) => s !== subtype));
      } else {
        onSubtypeChange([...subtypes, subtype]);
      }
    },
    [subtypes, onSubtypeChange]
  );

  const toggleDepot = useCallback(
    (depotId: string) => {
      if (depotIds.includes(depotId)) {
        onDepotChange(depotIds.filter((id) => id !== depotId));
      } else {
        onDepotChange([...depotIds, depotId]);
      }
    },
    [depotIds, onDepotChange]
  );

  // ── Derived data ──
  const sortedDepots = useMemo(
    () =>
      [...depots].sort((a, b) => {
        const aIndex = DEPOT_ORDER.indexOf(a.code.toLowerCase());
        const bIndex = DEPOT_ORDER.indexOf(b.code.toLowerCase());
        const aPos = aIndex === -1 ? 999 : aIndex;
        const bPos = bIndex === -1 ? 999 : bIndex;
        return aPos - bPos;
      }),
    [depots]
  );

  const activeFilterCount = statuses.length + categories.length + subtypes.length + depotIds.length;

  const selectedCategory = categories.length === 1 ? categories[0] : null;
  const availableSubtypes: readonly string[] = selectedCategory
    ? AssetSubtypesByCategory[selectedCategory]
    : [];

  // Build active filter descriptors for the summary strip
  const activeFilters = useMemo(() => {
    const items: { key: string; label: string; color: string; onRemove: () => void }[] = [];

    categories.forEach((c) =>
      items.push({
        key: `cat-${c}`,
        label: AssetCategoryLabels[c],
        color: CATEGORY_COLORS[c],
        onRemove: () => toggleCategory(c),
      })
    );
    subtypes.forEach((s) =>
      items.push({
        key: `sub-${s}`,
        label: s,
        color: colors.electricBlue,
        onRemove: () => toggleSubtype(s),
      })
    );
    depotIds.forEach((id) => {
      const depot = depots.find((d) => d.id === id);
      if (!depot) return;
      items.push({
        key: `dep-${id}`,
        label: depot.name,
        color: getDepotColor(depot),
        onRemove: () => toggleDepot(id),
      });
    });
    statuses.forEach((s) =>
      items.push({
        key: `stat-${s}`,
        label: AssetStatusLabels[s],
        color: AssetStatusColors[s],
        onRemove: () => toggleStatus(s),
      })
    );

    return items;
  }, [
    categories,
    subtypes,
    depotIds,
    statuses,
    depots,
    toggleCategory,
    toggleSubtype,
    toggleDepot,
    toggleStatus,
  ]);

  return (
    <View style={styles.wrapper}>
      {/* ── Zone 1: Unified Search Row ── */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, !searchValue && styles.searchInputPlaceholder]}
          placeholder="Search by Asset ID"
          placeholderTextColor={colors.textDisabled}
          value={searchValue}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityRole="search"
          accessibilityLabel="Search assets"
        />
        <TouchableOpacity
          style={[styles.filterToggle, isExpanded && styles.filterToggleActive]}
          onPress={handleToggle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} asset filters`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="options"
              size={18}
              color={isExpanded ? colors.textInverse : colors.text}
            />
          </Animated.View>
          {activeFilterCount > 0 && !isExpanded && (
            <View style={styles.countDot}>
              <AppText style={styles.countDotText}>{activeFilterCount}</AppText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Zone 2: Active Filter Strip ── */}
      {activeFilterCount > 0 && !isExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeStrip}
          contentContainerStyle={styles.activeStripContent}
        >
          {activeFilters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              isSelected
              selectedColor={f.color}
              onPress={f.onRemove}
              onRemove={f.onRemove}
              compact
            />
          ))}
          <TouchableOpacity
            style={styles.clearAllChip}
            onPress={onClearAll}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <AppText style={styles.clearAllText}>Clear all</AppText>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Zone 3: Expanded Filter Panel ── */}
      {isExpanded && (
        <View style={styles.expandedPanel}>
          {/* Asset Type */}
          <View style={styles.filterSection}>
            <View style={[styles.sectionAccent, { borderLeftColor: SECTION_ACCENTS.assetType }]}>
              <AppText style={styles.sectionLabel}>Asset Type</AppText>
              <View style={styles.chipsContainer}>
                {(Object.keys(AssetCategoryLabels) as AssetCategory[]).map((category) => (
                  <FilterChip
                    key={category}
                    label={AssetCategoryLabels[category]}
                    isSelected={categories.includes(category)}
                    onPress={() => toggleCategory(category)}
                    selectedColor={CATEGORY_COLORS[category]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Sub-Type (conditional) */}
          {availableSubtypes.length > 0 && (
            <View style={styles.filterSection}>
              <View style={[styles.sectionAccent, { borderLeftColor: SECTION_ACCENTS.subType }]}>
                <AppText style={styles.sectionLabel}>Sub-Type</AppText>
                <View style={styles.chipsContainer}>
                  {availableSubtypes.map((subtype) => (
                    <FilterChip
                      key={subtype}
                      label={subtype}
                      isSelected={subtypes.includes(subtype)}
                      onPress={() => toggleSubtype(subtype)}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Location */}
          <View style={styles.filterSection}>
            <View style={[styles.sectionAccent, { borderLeftColor: SECTION_ACCENTS.location }]}>
              <AppText style={styles.sectionLabel}>Location</AppText>
              <View style={styles.chipsContainer}>
                {sortedDepots.map((depot) => (
                  <FilterChip
                    key={depot.id}
                    label={depot.name}
                    isSelected={depotIds.includes(depot.id)}
                    onPress={() => toggleDepot(depot.id)}
                    selectedColor={getDepotColor(depot)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Service Status */}
          <View style={styles.filterSectionLast}>
            <View style={[styles.sectionAccent, { borderLeftColor: SECTION_ACCENTS.status }]}>
              <AppText style={styles.sectionLabel}>Service Status</AppText>
              <View style={styles.chipsContainer}>
                {(Object.keys(AssetStatusLabels) as AssetStatus[]).map((status) => (
                  <FilterChip
                    key={status}
                    label={AssetStatusLabels[status]}
                    isSelected={statuses.includes(status)}
                    onPress={() => toggleStatus(status)}
                    selectedColor={AssetStatusColors[status]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Clear all footer */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={styles.clearAllFooter}
              onPress={onClearAll}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.electricBlue} />
              <AppText style={styles.clearAllFooterText}>Clear all filters</AppText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // ── Zone 1: Search Row ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  searchInputPlaceholder: {
    fontFamily: fonts.italic,
  },
  filterToggle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chrome,
  },
  filterToggleActive: {
    backgroundColor: colors.electricBlue,
  },
  countDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.electricBlue,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countDotText: {
    fontSize: fontSize.micro,
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },

  // ── Zone 2: Active Strip ──
  activeStrip: {
    marginTop: spacing.sm,
  },
  activeStripContent: {
    gap: spacing.xs,
    paddingRight: spacing.base,
  },
  clearAllChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  clearAllText: {
    fontSize: fontSize.xxs,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },

  // ── Zone 3: Expanded Panel ──
  expandedPanel: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    ...shadows.sm,
  },
  filterSection: {
    marginBottom: spacing.base,
  },
  filterSectionLast: {
    marginBottom: 0,
  },
  sectionAccent: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  clearAllFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearAllFooterText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
});
