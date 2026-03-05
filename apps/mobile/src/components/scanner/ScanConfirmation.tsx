import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, AssetScanContext, AssetStatus } from '@rgr/shared';
import { AssetStatusColors, getDepotBadgeColors, formatAssetNumber, formatRelativeTime } from '@rgr/shared';
import { DefectStatusBadge } from '../maintenance/DefectStatusBadge';
import { MaintenanceStatusBadge } from '../maintenance/MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from '../maintenance/MaintenancePriorityBadge';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { LoadingDots } from '../common/LoadingDots';
import { Button } from '../common/Button';
import { DepotBadge } from '../common/DepotBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import { cardStyles } from '../../theme/cardStyles';
import type { MatchedDepot } from '../../hooks/scan/useScanActionFlow';

// ── Status helpers (mirrors AssetListItem) ───────────────────────────────────

const STATUS_ICONS: Record<AssetStatus, keyof typeof Ionicons.glyphMap> = {
  serviced: 'checkmark-circle',
  maintenance: 'construct-outline',
  out_of_service: 'close-circle-outline',
};

const getStatusColor = (status: AssetStatus): string =>
  AssetStatusColors[status] || colors.electricBlue;

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
  const insets = useSafeAreaInsets();

  const subtypeDisplay = asset.subtype
    ? asset.subtype
    : asset.category === 'dolly' ? 'Dolly' : 'Trailer';
  const depotBadgeColors = matchedDepot
    ? getDepotBadgeColors(matchedDepot.depot, colors.chrome, colors.text)
    : null;
  const statusColor = asset.status ? getStatusColor(asset.status) : colors.electricBlue;
  const statusIcon = asset.status ? STATUS_ICONS[asset.status] ?? 'ellipse-outline' : 'ellipse-outline';

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={30} color={colors.textInverse} />
        <Text style={styles.headerTitle}>Scan Successful</Text>
        <TouchableOpacity
          onPress={props.onUndoPress}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Undo scan and close"
          style={styles.headerCloseButton}
        >
          <Ionicons name="close" size={26} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Asset identity card (matches AssetListItem style) ── */}
        <View style={[cardStyles.containerInline, styles.assetCard, { borderLeftColor: statusColor }]}>
          <View style={styles.assetCardRow}>
            <View style={styles.assetIconContainer}>
              <Ionicons name={statusIcon} size={31} color={statusColor} />
            </View>
            <View style={styles.assetCardBody}>
              <View style={styles.assetHeaderRow}>
                <Text style={styles.assetNumber} numberOfLines={1}>
                  {asset.assetNumber ? formatAssetNumber(asset.assetNumber) : 'Unknown'}
                </Text>
                {asset.status && (
                  <View style={[styles.assetStatusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.assetStatusBadgeText}>
                      {asset.status.replace('_', ' ')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.assetFooterRow}>
                <Text style={styles.assetSubtype}>{subtypeDisplay}</Text>
                {matchedDepot && depotBadgeColors ? (
                  <DepotBadge
                    label={matchedDepot.depot.name}
                    bgColor={depotBadgeColors.bg}
                    textColor={depotBadgeColors.text}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* ── Context section (mechanic only) ── */}
        {props.variant === 'mechanic' && !isCreating && (
          <>
            <View style={styles.sectionDivider} />
            <ContextSection
              scanContext={props.scanContext}
              isLoading={props.isContextLoading}
              error={props.contextError}
              onRetry={props.onRetryContext}
              onPress={props.onContextPress}
              onDefectItemPress={props.onDefectItemPress}
              onTaskItemPress={props.onTaskItemPress}
            />
          </>
        )}
      </ScrollView>

      {/* ── Pinned footer (outside ScrollView) ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {/* Unified footer card */}
        <View style={styles.footerCardShadow}>
        <View style={styles.footerCard}>
          {/* Action buttons row */}
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
                <View style={styles.actionSeparator} />
                <ActionButton
                  icon={props.defectCompleted ? 'checkmark-circle' : 'warning'}
                  label="Defect"
                  completed={props.defectCompleted}
                  onPress={props.onDefectPress}
                  disabled={disabled}
                />
                <View style={styles.actionSeparator} />
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

        </View>
        </View>

        {/* Confirm button (separate, below action card) */}
        <Button
          onPress={props.onDonePress}
          disabled={disabled}
          style={styles.confirmButton}
          color={colors.success}
          accessibilityLabel="Confirm"
        >
          CONFIRM
        </Button>

      </View>
    </View>
  );
}

// ── Context section sub-component ─────────────────────────────────────────────

function ContextSection({
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

  const totalCount = scanContext.openDefectCount + scanContext.activeTaskCount;
  const shownCount = scanContext.openDefects.length + scanContext.activeTasks.length;
  const hasMore = totalCount > shownCount;

  return (
    <CollapsibleSection
      title="Open Items"
      variant="flat"
      defaultExpanded={false}
      badge={
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{totalCount}</Text>
        </View>
      }
    >
      <View style={styles.contextItemsList}>
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
    </CollapsibleSection>
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
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },

  // Header bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scrollable content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },

  // Asset identity card (mirrors AssetListItem)
  assetCard: {
    marginTop: spacing.base,
  },
  assetCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  assetCardBody: {
    flex: 1,
  },
  assetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  assetStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  assetStatusBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  assetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetSubtype: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section divider (hairline between hero and context)
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },

  // Count badge (on CollapsibleSection title)
  countBadge: {
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },

  // Context section
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
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
  contextItemsList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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

  // Pinned footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.chrome,
  },

  // Unified footer card
  footerCardShadow: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  footerCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // Action buttons (inside footer card)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.electricBlue,
    gap: spacing.xs,
  },
  actionSeparator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: spacing.sm,
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

  // Confirm button (separate, below action card)
  confirmButton: {
    marginTop: spacing.sm,
    ...shadows.sm,
  },

});
