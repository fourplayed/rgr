import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, Depot, AssetScanContext } from '@rgr/shared';
import { AssetStatusColors, getDepotBadgeColors } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { DefectStatusBadge } from '../maintenance/DefectStatusBadge';
import { MaintenancePriorityBadge } from '../maintenance/MaintenancePriorityBadge';
import { MaintenanceStatusBadge } from '../maintenance/MaintenanceStatusBadge';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';

// ── Types ────────────────────────────────────────────────────────────────────

type MatchedDepot = { depot: Depot; distanceKm: number };

type ScanCardProps =
  | {
      variant: 'driver';
      asset: Asset;
      matchedDepot: MatchedDepot | null;
      isCreating: boolean;
    }
  | {
      variant: 'mechanic';
      asset: Asset;
      matchedDepot: MatchedDepot | null;
      isCreating: boolean;
      scanContext: AssetScanContext | null;
      isContextLoading: boolean;
      contextError: Error | null;
      onRetryContext: () => void;
      onDefectPress: (id: string) => void;
      onTaskPress: (id: string) => void;
      onDonePress: () => void;
    };

// ── Component ────────────────────────────────────────────────────────────────

function ScanCardComponent(props: ScanCardProps) {
  const { asset, matchedDepot, isCreating } = props;

  // Animated entrance: slide down + fade in
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  // Formatting
  const subtypeDisplay = asset.subtype
    ? asset.subtype
    : asset.category === 'dolly' ? 'Dolly' : 'Trailer';
  const statusColor = AssetStatusColors[asset.status] ?? colors.electricBlue;
  const depotBadgeColors = matchedDepot
    ? getDepotBadgeColors(matchedDepot.depot, colors.chrome, colors.text)
    : null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        {/* ── Header row: asset info + done button (mechanic) ── */}
        <View style={styles.headerRow}>
          <View style={styles.assetInfo}>
            <View
              style={[styles.assetCard, { borderLeftColor: statusColor }]}
            >
              <View style={styles.assetHeader}>
                <Text style={styles.assetNumber}>
                  {asset.assetNumber ?? 'Unknown'}
                </Text>
                {asset.status && <StatusBadge status={asset.status} size="small" />}
              </View>
              <View style={styles.subtypeRow}>
                <Text style={styles.subtype}>{subtypeDisplay}</Text>
                {matchedDepot && depotBadgeColors ? (
                  <View
                    style={[
                      styles.depotBadge,
                      { backgroundColor: depotBadgeColors.bg },
                    ]}
                  >
                    <Ionicons name="location" size={12} color={depotBadgeColors.text} />
                    <Text style={[styles.depotBadgeText, { color: depotBadgeColors.text }]}>
                      {matchedDepot.depot.name}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {props.variant === 'mechanic' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={props.onDonePress}
              disabled={isCreating}
              accessibilityRole="button"
              accessibilityLabel="Done scanning"
              accessibilityHint="Double tap to finish and return to scanner"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Creating indicator ── */}
        {isCreating && (
          <View style={styles.creatingRow}>
            <LoadingDots color={colors.electricBlue} size={6} />
            <Text style={styles.creatingText}>Creating scan...</Text>
          </View>
        )}

        {/* ── Mechanic context section ── */}
        {props.variant === 'mechanic' && !isCreating && (
          <MechanicContext
            scanContext={props.scanContext}
            isLoading={props.isContextLoading}
            error={props.contextError}
            onRetry={props.onRetryContext}
            onDefectPress={props.onDefectPress}
            onTaskPress={props.onTaskPress}
          />
        )}
      </View>
    </Animated.View>
  );
}

// ── Mechanic context sub-component ───────────────────────────────────────────

function MechanicContext({
  scanContext,
  isLoading,
  error,
  onRetry,
  onDefectPress,
  onTaskPress,
}: {
  scanContext: AssetScanContext | null;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onDefectPress: (id: string) => void;
  onTaskPress: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.contextLoading}>
        <ActivityIndicator size="small" color={colors.electricBlue} />
        <Text style={styles.contextLoadingText}>Loading context...</Text>
      </View>
    );
  }

  if (error || !scanContext) {
    return (
      <TouchableOpacity style={styles.contextError} onPress={onRetry}>
        <Ionicons name="refresh" size={16} color={colors.warning} />
        <Text style={styles.contextErrorText}>
          Couldn't load — tap to retry
        </Text>
      </TouchableOpacity>
    );
  }

  const hasItems =
    scanContext.openDefectCount > 0 || scanContext.activeTaskCount > 0;

  if (!hasItems) {
    return (
      <View style={styles.noItemsRow}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.noItemsText}>No open items</Text>
      </View>
    );
  }

  return (
    <View style={styles.contextSection}>
      {/* Defect items */}
      {scanContext.openDefects.map((defect: { id: string; title: string; status: string; createdAt: string }) => (
        <TouchableOpacity
          key={defect.id}
          style={styles.inlineItem}
          onPress={() => onDefectPress(defect.id)}
          accessibilityRole="button"
          accessibilityLabel={`Defect: ${defect.title}`}
          accessibilityHint="Double tap to view defect details"
        >
          <Ionicons name="warning" size={16} color={colors.warning} style={styles.itemIcon} />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {defect.title}
          </Text>
          <DefectStatusBadge status={defect.status as 'reported' | 'accepted' | 'resolved' | 'dismissed'} />
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {/* Task items */}
      {scanContext.activeTasks.map((task: { id: string; title: string; status: string; priority: string; createdAt: string }) => (
        <TouchableOpacity
          key={task.id}
          style={styles.inlineItem}
          onPress={() => onTaskPress(task.id)}
          accessibilityRole="button"
          accessibilityLabel={`Task: ${task.title}`}
          accessibilityHint="Double tap to view task details"
        >
          <Ionicons name="construct" size={16} color={colors.electricBlue} style={styles.itemIcon} />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <MaintenancePriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'critical'} />
          <MaintenanceStatusBadge status={task.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'} />
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {/* Overflow indicator */}
      {(scanContext.openDefectCount > scanContext.openDefects.length ||
        scanContext.activeTaskCount > scanContext.activeTasks.length) && (
        <Text style={styles.overflowText}>
          {scanContext.openDefectCount} defect{scanContext.openDefectCount !== 1 ? 's' : ''},{' '}
          {scanContext.activeTaskCount} task{scanContext.activeTaskCount !== 1 ? 's' : ''} total
        </Text>
      )}
    </View>
  );
}

export const ScanCard = React.memo(ScanCardComponent);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.lg,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  assetInfo: {
    flex: 1,
  },
  assetCard: {
    borderLeftWidth: 4,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.xl,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  subtypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtype: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  depotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  depotBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
  },
  doneButtonText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  // Creating state
  creatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  creatingText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },

  // Context section
  contextSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  contextLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  contextLoadingText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  contextError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  contextErrorText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  noItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noItemsText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.success,
    textTransform: 'uppercase',
  },

  // Inline items
  inlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  itemIcon: {
    width: 20,
    textAlign: 'center',
  },
  itemTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  overflowText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
});
