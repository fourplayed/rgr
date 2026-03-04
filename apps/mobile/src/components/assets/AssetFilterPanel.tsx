import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetStatus, AssetCategory, Depot } from '@rgr/shared';
import { AssetStatusLabels, AssetStatusColors, AssetCategoryLabels, AssetSubtypesByCategory } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import { DEPOT_ORDER, getDepotColor, getDepotTextColor } from '../../utils/depotDisplay';
import { FilterChip } from '../common/FilterChip';
import '../../utils/enableLayoutAnimation';

// Category-specific colors for Asset Type filter chips
const CATEGORY_COLORS: Record<AssetCategory, string> = {
  trailer: '#8B5CF6', // Violet
  dolly: '#0E7490', // Cyan (WCAG AA compliant with white text)
};

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
}: AssetFilterPanelProps) {
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleExpanded();
  }, [onToggleExpanded]);

  const toggleStatus = useCallback((status: AssetStatus) => {
    if (statuses.includes(status)) {
      onStatusChange(statuses.filter((s) => s !== status));
    } else {
      onStatusChange([...statuses, status]);
    }
  }, [statuses, onStatusChange]);

  const toggleCategory = useCallback((category: AssetCategory) => {
    if (categories.includes(category)) {
      const newCategories = categories.filter((c) => c !== category);
      onCategoryChange(newCategories);
      // Clear subtypes that belong to the deselected category
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
      // Clear subtypes that don't belong to any selected category
      const validSubtypes = new Set(
        newCategories.flatMap((c) => [...AssetSubtypesByCategory[c]])
      );
      const filtered = subtypes.filter((s) => validSubtypes.has(s));
      if (filtered.length !== subtypes.length) {
        onSubtypeChange(filtered);
      }
    }
  }, [categories, subtypes, onCategoryChange, onSubtypeChange]);

  const toggleSubtype = useCallback((subtype: string) => {
    if (subtypes.includes(subtype)) {
      onSubtypeChange(subtypes.filter((s) => s !== subtype));
    } else {
      onSubtypeChange([...subtypes, subtype]);
    }
  }, [subtypes, onSubtypeChange]);

  const toggleDepot = useCallback((depotId: string) => {
    if (depotIds.includes(depotId)) {
      onDepotChange(depotIds.filter((id) => id !== depotId));
    } else {
      onDepotChange([...depotIds, depotId]);
    }
  }, [depotIds, onDepotChange]);

  // Sort depots by display order (memoized to avoid re-sorting on every render)
  const sortedDepots = useMemo(
    () =>
      [...depots].sort((a, b) => {
        const aIndex = DEPOT_ORDER.indexOf(a.code.toLowerCase());
        const bIndex = DEPOT_ORDER.indexOf(b.code.toLowerCase());
        const aPos = aIndex === -1 ? 999 : aIndex;
        const bPos = bIndex === -1 ? 999 : bIndex;
        return aPos - bPos;
      }),
    [depots],
  );

  // Count active filters
  const activeFilterCount = statuses.length + categories.length + subtypes.length + depotIds.length;

  // Get available subtypes based on selected categories
  const selectedCategory = categories.length === 1 ? categories[0] : null;
  const availableSubtypes: readonly string[] = selectedCategory
    ? AssetSubtypesByCategory[selectedCategory]
    : [];

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Header - Uncontained */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLabel}>Filters</Text>
          {activeFilterCount > 0 && !isExpanded && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.chevronButton}
          onPress={handleToggle}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} asset filters`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={20} color={colors.text} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Expandable Content */}
      {isExpanded && (
        <View style={styles.container}>
          {/* Asset Type Section */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Asset Type</Text>
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

          {/* Sub-Type Section (show when Asset Type selected) */}
          {availableSubtypes.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Sub-Type</Text>
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
          )}

          {/* Location Section */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.chipsContainer}>
              {sortedDepots.map((depot) => {
                const isSelected = depotIds.includes(depot.id);
                const chipColor = getDepotColor(depot);
                return (
                  <TouchableOpacity
                    key={depot.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? chipColor : colors.surface,
                        borderColor: isSelected ? 'transparent' : colors.border,
                      },
                    ]}
                    onPress={() => toggleDepot(depot.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${depot.name}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? getDepotTextColor(depot) : colors.text,
                          fontFamily: isSelected ? 'Lato_700Bold' : 'Lato_400Regular',
                        },
                      ]}
                    >
                      {depot.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Service Status Section */}
          <View style={styles.filterSectionLast}>
            <Text style={styles.sectionLabel}>Service Status</Text>
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
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.base,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevronButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: colors.electricBlue,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterSectionLast: {
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Depot chips use inline rendering with custom text colors per-depot
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
});
