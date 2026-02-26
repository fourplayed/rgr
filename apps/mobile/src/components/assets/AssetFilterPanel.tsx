import React, { useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetStatus, AssetCategory, Depot } from '@rgr/shared';
import { AssetStatusLabels, AssetStatusColors, AssetCategoryLabels, AssetSubtypesByCategory } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Category-specific colors for Asset Type filter chips
const CATEGORY_COLORS: Record<AssetCategory, string> = {
  trailer: '#8B5CF6', // Violet
  dolly: '#00CED1', // Cyan
};

// Depot display order
const DEPOT_ORDER = ['per', 'new', 'hed', 'kar', 'wub', 'car'];

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

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  selectedColor?: string;
}

// Memoized FilterChip to prevent unnecessary re-renders
const FilterChip = memo(function FilterChip({ label, isSelected, onPress, selectedColor }: FilterChipProps) {
  const bgColor = isSelected ? (selectedColor || colors.electricBlue) : colors.surface;
  const textColor = isSelected ? colors.textInverse : colors.text;
  const borderColor = isSelected ? 'transparent' : colors.border;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: textColor,
            fontFamily: isSelected ? 'Lato_700Bold' : 'Lato_400Regular',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

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
      onCategoryChange(categories.filter((c) => c !== category));
      // Clear subtypes when deselecting a category
      onSubtypeChange([]);
    } else {
      onCategoryChange([...categories, category]);
    }
  }, [categories, onCategoryChange, onSubtypeChange]);

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

  // Count active filters
  const activeFilterCount = statuses.length + categories.length + subtypes.length + depotIds.length;

  // Get available subtypes based on selected categories
  const selectedCategory = categories.length === 1 ? categories[0] : null;
  const availableSubtypes: readonly string[] = selectedCategory
    ? AssetSubtypesByCategory[selectedCategory]
    : [];

  const getDepotColor = useCallback((depot: Depot): string => {
    return depot.color || colors.electricBlue;
  }, []);

  const getDepotTextColor = useCallback((depot: Depot): string => {
    if (!depot.color) return colors.textInverse;
    // Simple luminance check — light backgrounds need dark text
    const c = depot.color.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? colors.text : colors.textInverse;
  }, []);

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
        <TouchableOpacity style={styles.chevronButton} onPress={handleToggle} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
              {[...depots]
                .sort((a, b) => {
                  const aIndex = DEPOT_ORDER.indexOf(a.code.toLowerCase());
                  const bIndex = DEPOT_ORDER.indexOf(b.code.toLowerCase());
                  // If not in DEPOT_ORDER, sort to end
                  const aPos = aIndex === -1 ? 999 : aIndex;
                  const bPos = bIndex === -1 ? 999 : bIndex;
                  return aPos - bPos;
                })
                .map((depot) => {
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
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
