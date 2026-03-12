import React, { memo, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { Depot } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';

export const DEPOT_ITEM_HEIGHT = 88;

interface DepotListItemProps {
  depot: Depot;
  onPress: (depot: Depot) => void;
  onLongPress?: (depot: Depot) => void;
}

function DepotListItemInner({ depot, onPress, onLongPress }: DepotListItemProps) {
  const handlePress = useCallback(() => {
    onPress(depot);
  }, [onPress, depot]);
  const handleLongPress = useCallback(() => {
    onLongPress?.(depot);
  }, [onLongPress, depot]);
  const borderColor = depot.isActive ? colors.success : colors.textSecondary;
  const containerStyle = useMemo(
    () => [
      styles.container,
      { borderColor, borderWidth: 0.5, backgroundColor: borderColor + '08' },
    ],
    [borderColor]
  );

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${depot.name}, ${depot.isActive ? 'active' : 'inactive'}`}
    >
      <View style={styles.headerRow}>
        <AppText style={styles.name} numberOfLines={1}>
          {depot.name}
        </AppText>
        <AppText
          style={[
            styles.statusText,
            { color: depot.isActive ? colors.success : colors.textSecondary },
          ]}
        >
          {depot.isActive ? 'Active' : 'Inactive'}
        </AppText>
      </View>
      <View style={styles.footerRow}>
        <AppText style={styles.code}>{depot.code.toUpperCase()}</AppText>
        {depot.address && (
          <AppText style={styles.address} numberOfLines={1}>
            {depot.address}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const DepotListItem = memo(DepotListItemInner, (prev, next) => {
  return (
    prev.depot.id === next.depot.id &&
    prev.depot.isActive === next.depot.isActive &&
    prev.depot.name === next.depot.name &&
    prev.depot.code === next.depot.code &&
    prev.depot.address === next.depot.address &&
    prev.onPress === next.onPress &&
    prev.onLongPress === next.onLongPress
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
    fontFamily: fonts.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
  },
  address: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    textAlign: 'right',
  },
});
