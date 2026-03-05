import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, AssetScanContext } from '@rgr/shared';
import { AssetStatusColors, getDepotBadgeColors, formatAssetNumber, formatRelativeTime } from '@rgr/shared';
import { DefectStatusBadge } from '../maintenance/DefectStatusBadge';
import { MaintenanceStatusBadge } from '../maintenance/MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from '../maintenance/MaintenancePriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import type { MatchedDepot } from '../../hooks/scan/useScanActionFlow';

// ── Types ────────────────────────────────────────────────────────────────────

type ScanConfirmationProps =
  | {
      variant: 'driver';
      asset: Asset;
      matchedDepot: MatchedDepot | null;
      isCreating: boolean;
      onPhotoPress: () => void;
      onDonePress: () => void;
      onUndoPress: () => void;
      photoCompleted: boolean;
      disabled: boolean;
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
      onPhotoPress: () => void;
      onDefectPress: () => void;
      onTaskPress: () => void;
      onDonePress: () => void;
      onUndoPress: () => void;
      onContextPress: () => void;
      onDefectItemPress?: (defectId: string) => void;
      onTaskItemPress?: (maintenanceId: string) => void;
      photoCompleted: boolean;
      defectCompleted: boolean;
      disabled: boolean;
    };

// ── Component ────────────────────────────────────────────────────────────────

function ScanConfirmationComponent(props: ScanConfirmationProps) {
  const { asset, matchedDepot, isCreating, disabled } = props;

  const subtypeDisplay = asset.subtype
    ? asset.subtype
    : asset.category === 'dolly' ? 'Dolly' : 'Trailer';
  const statusColor = AssetStatusColors[asset.status] ?? colors.electricBlue;
  const depotBadgeColors = matchedDepot
    ? getDepotBadgeColors(matchedDepot.depot, colors.chrome, colors.text)
    : null;

  const hasContextItems =
    props.variant === 'mechanic' &&
    !isCreating &&
    props.scanContext != null &&
    (props.scanContext.openDefectCount > 0 || props.scanContext.activeTaskCount > 0);

  const ContentWrapper = hasContextItems ? ScrollView : View;
  const contentWrapperProps = hasContextItems
    ? {
        style: [styles.content, styles.contentWithItems],
        contentContainerStyle: styles.scrollContent,
        bounces: true,
        showsVerticalScrollIndicator: false,
      }
    : { style: styles.content };

  return (
    <SafeAreaView style={styles.container}>
      <ContentWrapper {...contentWrapperProps}>
        {/* ── Status header ── */}
        <View style={styles.statusHeader}>
          {isCreating ? (
            <>
              <LoadingDots color={colors.electricBlue} size={8} />
              <Text style={styles.creatingText}>Creating scan...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={styles.recordedText}>Scan Recorded</Text>
            </>
          )}
        </View>

        {/* ── Asset card ── */}
        <View style={[styles.assetCard, { borderLeftColor: statusColor }]}>
          <View style={styles.assetHeader}>
            <Text style={styles.assetNumber}>
              {asset.assetNumber ? formatAssetNumber(asset.assetNumber) : 'Unknown'}
            </Text>
            {asset.status && <StatusBadge status={asset.status} size="small" />}
          </View>
          <View style={styles.subtypeRow}>
            <Text style={styles.subtype}>{subtypeDisplay}</Text>
            {matchedDepot && depotBadgeColors ? (
              <View style={[styles.depotBadge, { backgroundColor: depotBadgeColors.bg }]}>
                <Ionicons name="location" size={12} color={depotBadgeColors.text} />
                <Text style={[styles.depotBadgeText, { color: depotBadgeColors.text }]}>
                  {matchedDepot.depot.name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Context row (mechanic only) ── */}
        {props.variant === 'mechanic' && !isCreating && (
          <ContextRow
            scanContext={props.scanContext}
            isLoading={props.isContextLoading}
            error={props.contextError}
            onRetry={props.onRetryContext}
            onPress={props.onContextPress}
            onDefectItemPress={props.onDefectItemPress}
            onTaskItemPress={props.onTaskItemPress}
          />
        )}

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          {props.variant === 'mechanic' ? (
            <>
              <ActionButton
                icon={props.photoCompleted ? 'checkmark-circle' : 'camera'}
                label="Photo"
                completed={props.photoCompleted}
                onPress={props.onPhotoPress}
                disabled={disabled}
              />
              <ActionButton
                icon={props.defectCompleted ? 'checkmark-circle' : 'warning'}
                label="Defect"
                completed={props.defectCompleted}
                onPress={props.onDefectPress}
                disabled={disabled}
              />
              <ActionButton
                icon="construct"
                label="Task"
                completed={false}
                onPress={props.onTaskPress}
                disabled={disabled}
              />
            </>
          ) : (
            <ActionButton
              icon={props.photoCompleted ? 'checkmark-circle' : 'camera'}
              label="Photo"
              completed={props.photoCompleted}
              onPress={props.onPhotoPress}
              disabled={disabled}
            />
          )}
        </View>

        {/* ── Done button ── */}
        <TouchableOpacity
          style={[styles.doneButton, disabled && styles.doneButtonDisabled]}
          onPress={props.onDonePress}
          disabled={disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Done"
          accessibilityHint="Double tap to finish and return to scanner"
        >
          <Text style={styles.doneButtonText}>DONE</Text>
        </TouchableOpacity>

        {/* ── Undo link ── */}
        <TouchableOpacity
          style={styles.undoLink}
          onPress={props.onUndoPress}
          disabled={disabled}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Undo scan"
          accessibilityHint="Double tap to undo the last scan"
        >
          <Text style={[styles.undoLinkText, disabled && styles.undoLinkDisabled]}>
            Undo scan
          </Text>
        </TouchableOpacity>
      </ContentWrapper>
    </SafeAreaView>
  );
}

// ── Context row sub-component ────────────────────────────────────────────────

function ContextRow({
  scanContext,
  isLoading,
  error,
  onRetry,
  onPress,
  onDefectItemPress,
  onTaskItemPress,
}: {
  scanContext: AssetScanContext | null;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onPress: () => void;
  onDefectItemPress?: ((defectId: string) => void) | undefined;
  onTaskItemPress?: ((maintenanceId: string) => void) | undefined;
}) {
  if (isLoading) {
    return (
      <View style={styles.contextCard}>
        <LoadingDots color={colors.textSecondary} size={6} />
        <Text style={styles.contextLoadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !scanContext) {
    return (
      <TouchableOpacity style={styles.contextCard} onPress={onRetry}>
        <Ionicons name="refresh" size={16} color={colors.warning} />
        <Text style={styles.contextErrorText}>Couldn't load — tap to retry</Text>
      </TouchableOpacity>
    );
  }

  const hasItems =
    scanContext.openDefectCount > 0 || scanContext.activeTaskCount > 0;

  if (!hasItems) {
    return (
      <View style={styles.contextCard}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.noItemsText}>No open items</Text>
      </View>
    );
  }

  // Build summary header
  const parts: string[] = [];
  if (scanContext.openDefectCount > 0) {
    parts.push(`${scanContext.openDefectCount} defect${scanContext.openDefectCount !== 1 ? 's' : ''}`);
  }
  if (scanContext.activeTaskCount > 0) {
    parts.push(`${scanContext.activeTaskCount} task${scanContext.activeTaskCount !== 1 ? 's' : ''}`);
  }

  const totalCount = scanContext.openDefectCount + scanContext.activeTaskCount;
  const shownCount = scanContext.openDefects.length + scanContext.activeTasks.length;
  const hasMore = totalCount > shownCount;

  return (
    <View style={styles.contextSection}>
      {/* Summary header */}
      <View style={styles.contextSummaryHeader}>
        <Ionicons name="warning" size={16} color={colors.warning} />
        <Text style={styles.contextItemsText}>{parts.join(' · ')}</Text>
      </View>

      {/* Individual defect rows */}
      {scanContext.openDefects.map((defect) => (
        <TouchableOpacity
          key={defect.id}
          style={styles.contextItemRow}
          onPress={() => onDefectItemPress?.(defect.id)}
          accessibilityRole="button"
          accessibilityLabel={`Defect: ${defect.title}`}
        >
          <Ionicons name="warning" size={18} color={colors.warning} style={styles.contextItemIcon} />
          <View style={styles.contextItemCenter}>
            <Text style={styles.contextItemTitle} numberOfLines={1}>{defect.title}</Text>
            <View style={styles.contextItemMeta}>
              <DefectStatusBadge status={defect.status} />
              <Text style={styles.contextItemTime}>{formatRelativeTime(defect.createdAt)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {/* Individual task rows */}
      {scanContext.activeTasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          style={styles.contextItemRow}
          onPress={() => onTaskItemPress?.(task.id)}
          accessibilityRole="button"
          accessibilityLabel={`Task: ${task.title}`}
        >
          <Ionicons name="construct" size={18} color={colors.electricBlue} style={styles.contextItemIcon} />
          <View style={styles.contextItemCenter}>
            <Text style={styles.contextItemTitle} numberOfLines={1}>{task.title}</Text>
            <View style={styles.contextItemMeta}>
              <MaintenanceStatusBadge status={task.status} />
              <MaintenancePriorityBadge priority={task.priority} />
              <Text style={styles.contextItemTime}>{formatRelativeTime(task.createdAt)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {/* "View all" link when more items exist than shown */}
      {hasMore && (
        <TouchableOpacity
          style={styles.viewAllLink}
          onPress={onPress}
          accessibilityRole="link"
          accessibilityLabel="View all on asset page"
        >
          <Text style={styles.viewAllText}>View all on asset page</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.electricBlue} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Action button sub-component ──────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  completed,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  completed: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const iconColor = disabled
    ? colors.textSecondary
    : completed
      ? colors.success
      : colors.textInverse;

  const labelColor = disabled
    ? colors.textSecondary
    : completed
      ? colors.success
      : colors.textInverse;

  return (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={[styles.actionLabel, { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export const ScanConfirmation = React.memo(ScanConfirmationComponent);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  contentWithItems: {
    justifyContent: 'flex-start',
  },
  scrollContent: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },

  // Status header
  statusHeader: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  creatingText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recordedText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },

  // Asset card
  assetCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderLeftWidth: 4,
    ...shadows.lg,
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

  // Context row
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginTop: spacing.base,
  },
  contextLoadingText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  contextErrorText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  noItemsText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.success,
    textTransform: 'uppercase',
  },
  contextItemsText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  contextSection: {
    marginTop: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  contextSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.chrome,
  },
  contextItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.chrome,
  },
  contextItemIcon: {
    marginRight: spacing.sm,
  },
  contextItemCenter: {
    flex: 1,
    marginRight: spacing.sm,
  },
  contextItemTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: 2,
  },
  contextItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  contextItemTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  viewAllText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.overlayCard,
    gap: spacing.xs,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Done button
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Undo link
  undoLink: {
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  undoLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  undoLinkDisabled: {
    opacity: 0.5,
  },
});
