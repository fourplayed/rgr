import React, { useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DefectStatus } from '@rgr/shared';
import { DefectStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import { FilterChip } from '../common/FilterChip';
import '../../utils/enableLayoutAnimation';

interface DefectFilterPanelProps {
  statuses: DefectStatus[];
  onStatusChange: (statuses: DefectStatus[]) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const STATUS_ORDER: DefectStatus[] = ['reported', 'accepted', 'resolved', 'dismissed'];

const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  reported: colors.warning,
  accepted: colors.info,
  resolved: colors.success,
  dismissed: colors.textSecondary,
};

export const DefectFilterPanel = memo(function DefectFilterPanel({
  statuses,
  onStatusChange,
  isExpanded,
  onToggleExpanded,
}: DefectFilterPanelProps) {
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

  const toggleStatus = useCallback((status: DefectStatus) => {
    if (statuses.includes(status)) {
      onStatusChange(statuses.filter((s) => s !== status));
    } else {
      onStatusChange([...statuses, status]);
    }
  }, [statuses, onStatusChange]);

  const activeFilterCount = statuses.length;

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
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} defect filters`}
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
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.chipsContainer}>
              {STATUS_ORDER.map((status) => (
                <FilterChip
                  key={status}
                  label={DefectStatusLabels[status]}
                  isSelected={statuses.includes(status)}
                  onPress={() => toggleStatus(status)}
                  selectedColor={DEFECT_STATUS_COLORS[status] ?? colors.electricBlue}
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
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevronButton: {
    backgroundColor: colors.background,
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
    gap: spacing.xs,
  },
});
