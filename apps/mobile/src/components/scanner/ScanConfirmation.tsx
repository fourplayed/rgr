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
import type { Asset, AssetScanContext } from '@rgr/shared';
import { getDepotBadgeColors, formatAssetNumber, formatRelativeTime } from '@rgr/shared';
import { DefectStatusBadge } from '../maintenance/DefectStatusBadge';
import { MaintenanceStatusBadge } from '../maintenance/MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from '../maintenance/MaintenancePriorityBadge';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { StatusBadge } from '../common/StatusBadge';
import { LoadingDots } from '../common/LoadingDots';
import { Button } from '../common/Button';
import { DepotBadge } from '../common/DepotBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
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
  const insets = useSafeAreaInsets();

  const subtypeDisplay = asset.subtype
    ? asset.subtype
    : asset.category === 'dolly' ? 'Dolly' : 'Trailer';
  const depotBadgeColors = matchedDepot
    ? getDepotBadgeColors(matchedDepot.depot, colors.chrome, colors.text)
    : null;

  return (
    <View style={styles.container}>
      {/* ── Handle bar ── */}
      <View style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      {/* ── Back / close button ── */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={props.onDonePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </TouchableOpacity>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero section ── */}
        <View style={styles.heroSection}>
          {isCreating ? (
            <View style={styles.heroStatusRow}>
              <LoadingDots color={colors.electricBlue} size={6} />
              <Text style={styles.heroStatusText}>Confirming...</Text>
            </View>
          ) : (
            <View style={styles.heroStatusRow}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              <Text style={styles.heroStatusText}>Scan Confirmed</Text>
            </View>
          )}

          <Text style={styles.heroAssetNumber}>
            {asset.assetNumber ? formatAssetNumber(asset.assetNumber) : 'Unknown'}
          </Text>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroSubtype}>{subtypeDisplay}</Text>
            {asset.status && <StatusBadge status={asset.status} size="small" />}
          </View>

          {matchedDepot && depotBadgeColors ? (
            <View style={styles.heroDepotRow}>
              <DepotBadge
                label={matchedDepot.depot.name}
                bgColor={depotBadgeColors.bg}
                textColor={depotBadgeColors.text}
                showIcon
              />
            </View>
          ) : null}
        </View>

        {/* ── Hairline separator ── */}
        <View style={styles.separator} />

        {/* ── Context section (mechanic only) ── */}
        {props.variant === 'mechanic' && !isCreating && (
          <ContextSection
            scanContext={props.scanContext}
            isLoading={props.isContextLoading}
            error={props.contextError}
            onRetry={props.onRetryContext}
            onPress={props.onContextPress}
            onDefectItemPress={props.onDefectItemPress}
            onTaskItemPress={props.onTaskItemPress}
          />
        )}
      </ScrollView>

      {/* ── Pinned footer (outside ScrollView) ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
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

        {/* Done button */}
        <Button
          onPress={props.onDonePress}
          disabled={disabled}
          style={styles.doneButton}
          accessibilityLabel="Done"
        >
          DONE
        </Button>

        {/* Undo link */}
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
      title={`Open Items (${totalCount})`}
      variant="flat"
      defaultExpanded
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
      : colors.text;

  const labelColor = disabled
    ? colors.textSecondary
    : completed
      ? colors.success
      : colors.text;

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
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },

  // Handle bar
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.chrome,
  },

  // Back button
  backButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.xs,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  // Scrollable content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  heroStatusText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAssetNumber: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroSubtype: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDepotRow: {
    marginTop: spacing.xs,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.base,
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
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
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
    marginTop: spacing.sm,
  },

  // Undo link
  undoLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
