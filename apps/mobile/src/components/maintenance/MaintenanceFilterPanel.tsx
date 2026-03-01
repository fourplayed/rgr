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
import type { MaintenanceStatus, MaintenancePriority } from '@rgr/shared';
import { MaintenanceStatusLabels, MaintenancePriorityLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MaintenanceFilterPanelProps {
  statuses: MaintenanceStatus[];
  priorities: MaintenancePriority[];
  onStatusChange: (statuses: MaintenanceStatus[]) => void;
  onPriorityChange: (priorities: MaintenancePriority[]) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  selectedColor?: string;
}

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
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: isSelected }}
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

const STATUS_ORDER: MaintenanceStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_ORDER: MaintenancePriority[] = ['low', 'medium', 'high', 'critical'];

export const MaintenanceFilterPanel = memo(function MaintenanceFilterPanel({
  statuses,
  priorities,
  onStatusChange,
  onPriorityChange,
  isExpanded,
  onToggleExpanded,
}: MaintenanceFilterPanelProps) {
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

  const toggleStatus = useCallback((status: MaintenanceStatus) => {
    if (statuses.includes(status)) {
      onStatusChange(statuses.filter((s) => s !== status));
    } else {
      onStatusChange([...statuses, status]);
    }
  }, [statuses, onStatusChange]);

  const togglePriority = useCallback((priority: MaintenancePriority) => {
    if (priorities.includes(priority)) {
      onPriorityChange(priorities.filter((p) => p !== priority));
    } else {
      onPriorityChange([...priorities, priority]);
    }
  }, [priorities, onPriorityChange]);

  // Count active filters
  const activeFilterCount = statuses.length + priorities.length;

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Header */}
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
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} maintenance filters`}
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
          {/* Status Section */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.chipsContainer}>
              {STATUS_ORDER.map((status) => (
                <FilterChip
                  key={status}
                  label={MaintenanceStatusLabels[status]}
                  isSelected={statuses.includes(status)}
                  onPress={() => toggleStatus(status)}
                  selectedColor={colors.maintenanceStatus[status as keyof typeof colors.maintenanceStatus] ?? colors.electricBlue}
                />
              ))}
            </View>
          </View>

          {/* Priority Section */}
          <View style={styles.filterSectionLast}>
            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.chipsContainer}>
              {PRIORITY_ORDER.map((priority) => (
                <FilterChip
                  key={priority}
                  label={MaintenancePriorityLabels[priority]}
                  isSelected={priorities.includes(priority)}
                  onPress={() => togglePriority(priority)}
                  selectedColor={colors.maintenancePriority[priority as keyof typeof colors.maintenancePriority] ?? colors.electricBlue}
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
