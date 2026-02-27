import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Depot } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

export const DEPOT_ITEM_HEIGHT = 88;

interface DepotListItemProps {
  depot: Depot;
  onPress: (depot: Depot) => void;
  onLongPress?: (depot: Depot) => void;
}

function DepotListItemInner({ depot, onPress, onLongPress }: DepotListItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderLeftColor: depot.isActive ? colors.success : '#6B7280',
        },
      ]}
      onPress={() => onPress(depot)}
      onLongPress={() => onLongPress?.(depot)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${depot.name}, ${depot.isActive ? 'active' : 'inactive'}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {depot.name}
        </Text>
        <Text
          style={[
            styles.statusText,
            { color: depot.isActive ? colors.success : '#6B7280' },
          ]}
        >
          {depot.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.code}>{depot.code.toUpperCase()}</Text>
        {depot.address && (
          <Text style={styles.address} numberOfLines={1}>
            {depot.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const DepotListItem = memo(DepotListItemInner, (prev, next) => {
  return (
    prev.depot.id === next.depot.id &&
    prev.depot.isActive === next.depot.isActive &&
    prev.depot.name === next.depot.name
  );
});

const styles = StyleSheet.create({
  container: {
    height: DEPOT_ITEM_HEIGHT,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },
  address: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginLeft: spacing.md,
    textAlign: 'right',
  },
});
