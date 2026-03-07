import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, AssetWithRelations, AssetScanContext } from '@rgr/shared';
import { DefectStatusLabels, MaintenanceStatusLabels } from '@rgr/shared';
import { AssetInfoCard } from '../assets/AssetInfoCard';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { SegmentedTabs } from '../common/SegmentedTabs';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';
import type { MatchedDepot } from '../../hooks/scan/useScanActionFlow';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Tab configuration ─────────────────────────────────────────────────────────

type ScanTab = 'actions' | 'openItems';

const SCAN_TABS = [
  { key: 'actions' as const, label: 'Actions' },
  { key: 'openItems' as const, label: 'Open Items' },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type ConfirmAction = 'photo' | 'defect' | 'maintenance' | null;

type ScanConfirmationProps =
  | {
      variant: 'driver';
      asset: Asset;
      matchedDepot: MatchedDepot | null;
      isCreating: boolean;
      onConfirm: (action: ConfirmAction) => void;
      onUndoPress: () => void;
      photoCompleted: boolean;
      disabled: boolean;
      assessment?: string | null;
    }
  | {
      variant: 'mechanic';
      asset: Asset;
      matchedDepot: MatchedDepot | null;
      isCreating: boolean;
      onConfirm: (action: ConfirmAction) => void;
      onUndoPress: () => void;
      photoCompleted: boolean;
      defectCompleted: boolean;
      maintenanceCompleted: boolean;
      disabled: boolean;
      assessment?: string | null;
      scanContext?: AssetScanContext | null;
      onDefectPress?: (id: string) => void;
      onTaskPress?: (id: string) => void;
    };

// ── Component ────────────────────────────────────────────────────────────────

function ScanConfirmationComponent(props: ScanConfirmationProps) {
  const { asset, matchedDepot, disabled, isCreating } = props;

  // Build AssetWithRelations for AssetInfoCard
  const assetWithRelations = useMemo<AssetWithRelations>(() => ({
    ...asset,
    depotName: matchedDepot?.depot.name ?? null,
    depotCode: matchedDepot?.depot.code ?? null,
    driverName: null,
    lastScannerName: null,
    photoCount: 0,
  }), [asset, matchedDepot]);

  // Single-select action state (radio behavior)
  const [selectedAction, setSelectedAction] = useState<ConfirmAction>(null);
  const [activeTab, setActiveTab] = useState<ScanTab>('actions');

  // Show tabs only for mechanics with existing open items
  const hasOpenItems = props.variant === 'mechanic' && props.scanContext != null
    && (props.scanContext.openDefectCount + props.scanContext.activeTaskCount) > 0;

  const toggleAction = (action: ConfirmAction) => {
    setSelectedAction(prev => (prev === action ? null : action));
  };

  // Derive completed states
  const defectCompleted = props.variant === 'mechanic' ? props.defectCompleted : false;
  const maintenanceCompleted = props.variant === 'mechanic' ? props.maintenanceCompleted : false;

  // Button color matches selected action
  const buttonColor = selectedAction === 'maintenance'
    ? colors.warning
    : selectedAction === 'defect'
      ? colors.defectYellow
      : selectedAction === 'photo'
        ? colors.violet
        : colors.success;

  // Loading state during scan creation
  const isLoading = isCreating && disabled;
  const buttonLabel = isLoading
    ? 'Creating scan...'
    : selectedAction === 'photo'
      ? 'Capture Photo'
      : selectedAction === 'defect'
        ? 'Report Defect'
        : selectedAction === 'maintenance'
          ? 'Schedule Maintenance'
          : 'DONE';

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      <SheetHeader icon="cube" title="Asset Found" onClose={props.onUndoPress} />

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Asset detail card (collapsible) ── */}
        <View style={styles.assetCard}>
          <AssetInfoCard asset={assetWithRelations} assessment={props.assessment ?? null} />
        </View>

        {/* ── Location info ── */}
        {matchedDepot && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.success} />
            <Text style={styles.locationText}>
              Location updated to <Text style={styles.locationName}>{matchedDepot.depot.name}</Text>
              {' '}({matchedDepot.distanceKm < 1
                ? `${Math.round(matchedDepot.distanceKm * 1000)}m away`
                : `${matchedDepot.distanceKm.toFixed(1)}km away`})
            </Text>
          </View>
        )}

        {/* ── Tabbed layout (mechanic with open items) or flat actions ── */}
        {props.variant === 'mechanic' && hasOpenItems ? (
          <>
            <View style={styles.tabContainer}>
              <SegmentedTabs
                tabs={SCAN_TABS}
                activeTab={activeTab}
                onTabPress={setActiveTab}
              />
            </View>
            {activeTab === 'actions' ? (
              <View style={styles.checkboxList}>
                <CheckboxOption
                  icon="camera"
                  label="Capture Photo"
                  description="Take a photo for visual records"
                  checked={props.photoCompleted || selectedAction === 'photo'}
                  completed={props.photoCompleted}
                  onToggle={() => toggleAction('photo')}
                  disabled={disabled || props.photoCompleted}
                  accentColor={colors.violet}
                />
                <CheckboxOption
                  icon="warning"
                  label="Report Defect"
                  description="Log severity, description, and photo evidence"
                  checked={defectCompleted || selectedAction === 'defect'}
                  completed={defectCompleted}
                  onToggle={() => toggleAction('defect')}
                  disabled={disabled || defectCompleted}
                  accentColor={colors.defectYellow}
                />
                <CheckboxOption
                  icon="construct"
                  label="Schedule Maintenance"
                  description="Create a task with priority and work details"
                  checked={maintenanceCompleted || selectedAction === 'maintenance'}
                  completed={maintenanceCompleted}
                  onToggle={() => toggleAction('maintenance')}
                  disabled={disabled || maintenanceCompleted}
                  accentColor={colors.warning}
                />
              </View>
            ) : (
              props.scanContext && (
                <OpenItemsSection
                  scanContext={props.scanContext}
                  onDefectPress={props.onDefectPress}
                  onTaskPress={props.onTaskPress}
                  alwaysExpanded
                />
              )
            )}
          </>
        ) : (
          <>
            <Text style={styles.checkboxSectionTitle}>Actions</Text>
            <View style={styles.checkboxList}>
              <CheckboxOption
                icon="camera"
                label="Capture Photo"
                description="Take a photo for visual records"
                checked={props.photoCompleted || selectedAction === 'photo'}
                completed={props.photoCompleted}
                onToggle={() => toggleAction('photo')}
                disabled={disabled || props.photoCompleted}
                accentColor={colors.violet}
              />
              {props.variant === 'mechanic' && (
                <>
                  <CheckboxOption
                    icon="warning"
                    label="Report Defect"
                    description="Log severity, description, and photo evidence"
                    checked={defectCompleted || selectedAction === 'defect'}
                    completed={defectCompleted}
                    onToggle={() => toggleAction('defect')}
                    disabled={disabled || defectCompleted}
                    accentColor={colors.defectYellow}
                  />
                  <CheckboxOption
                    icon="construct"
                    label="Schedule Maintenance"
                    description="Create a task with priority and work details"
                    checked={maintenanceCompleted || selectedAction === 'maintenance'}
                    completed={maintenanceCompleted}
                    onToggle={() => toggleAction('maintenance')}
                    disabled={disabled || maintenanceCompleted}
                    accentColor={colors.warning}
                  />
                </>
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* ── Pinned footer (outside ScrollView) ── */}
      <SheetFooter>
        <Button
          onPress={() => props.onConfirm(selectedAction)}
          disabled={disabled}
          isLoading={isLoading}
          style={styles.confirmButton}
          color={buttonColor}
          accessibilityLabel={buttonLabel}
        >
          {buttonLabel}
        </Button>
      </SheetFooter>
    </View>
  );
}

// ── Open Items section sub-component ──────────────────────────────────────────

function OpenItemsSection({
  scanContext,
  onDefectPress,
  onTaskPress,
  alwaysExpanded = false,
}: {
  scanContext: AssetScanContext;
  onDefectPress?: ((id: string) => void) | undefined;
  onTaskPress?: ((id: string) => void) | undefined;
  alwaysExpanded?: boolean;
}) {
  const { openDefects, activeTasks, openDefectCount, activeTaskCount } = scanContext;
  const [expanded, setExpanded] = useState(false);

  const totalCount = openDefectCount + activeTaskCount;
  if (totalCount === 0) return null;

  const extraDefects = openDefectCount - openDefects.length;
  const extraTasks = activeTaskCount - activeTasks.length;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  const isExpanded = alwaysExpanded || expanded;

  return (
    <>
      {/* Collapsible header (hidden when rendered inside a tab) */}
      {!alwaysExpanded && (
        <TouchableOpacity
          style={styles.openItemsHeader}
          onPress={toggleExpanded}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Open items, ${totalCount} total. ${expanded ? 'Collapse' : 'Expand'}`}
        >
          <Text style={styles.checkboxSectionTitle}>
            Open Items
          </Text>
          <View style={styles.openItemsHeaderRight}>
            <View style={styles.openItemsCountBadge}>
              <Text style={styles.openItemsCountText}>{totalCount}</Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Content */}
      {isExpanded && (
        <View style={styles.openItemsList}>
          {openDefects.map((defect, i) => (
            <TouchableOpacity
              key={defect.id}
              style={[
                styles.openItemRow,
                i < openDefects.length + activeTasks.length - 1 && styles.openItemRowBorder,
              ]}
              onPress={() => onDefectPress?.(defect.id)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={`Defect: ${defect.title}`}
            >
              <View style={[styles.openItemIconContainer, { backgroundColor: `${colors.defectYellow}18` }]}>
                <Ionicons name="warning" size={18} color={colors.defectYellow} />
              </View>
              <View style={styles.openItemTextColumn}>
                <Text style={[styles.openItemTypeLabel, { color: colors.defectYellow }]}>Defect Report</Text>
                <Text style={styles.openItemTitle} numberOfLines={1}>{defect.title}</Text>
                <View style={styles.openItemStatusRow}>
                  <View style={[styles.openItemStatusDot, { backgroundColor: colors.defectYellow }]} />
                  <Text style={styles.openItemStatus}>{DefectStatusLabels[defect.status] ?? defect.status}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          ))}
          {extraDefects > 0 && (
            <TouchableOpacity
              style={styles.openItemMoreRow}
              onPress={() => onDefectPress?.(openDefects[0]?.id ?? '')}
              activeOpacity={0.6}
              accessibilityRole="link"
              accessibilityLabel={`View ${extraDefects} more defects`}
            >
              <Text style={[styles.openItemMore, { color: colors.defectYellow }]}>
                +{extraDefects} more {extraDefects === 1 ? 'defect' : 'defects'}
              </Text>
            </TouchableOpacity>
          )}

          {activeTasks.map((task, i) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.openItemRow,
                i < activeTasks.length - 1 && styles.openItemRowBorder,
              ]}
              onPress={() => onTaskPress?.(task.id)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={`Task: ${task.title}`}
            >
              <View style={[styles.openItemIconContainer, { backgroundColor: `${colors.warning}18` }]}>
                <Ionicons name="construct" size={18} color={colors.warning} />
              </View>
              <View style={styles.openItemTextColumn}>
                <Text style={[styles.openItemTypeLabel, { color: colors.warning }]}>Maintenance Task</Text>
                <Text style={styles.openItemTitle} numberOfLines={1}>{task.title}</Text>
                <View style={styles.openItemStatusRow}>
                  <View style={[styles.openItemStatusDot, { backgroundColor: colors.warning }]} />
                  <Text style={styles.openItemStatus}>{MaintenanceStatusLabels[task.status] ?? task.status}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          ))}
          {extraTasks > 0 && (
            <TouchableOpacity
              style={styles.openItemMoreRow}
              onPress={() => onTaskPress?.(activeTasks[0]?.id ?? '')}
              activeOpacity={0.6}
              accessibilityRole="link"
              accessibilityLabel={`View ${extraTasks} more tasks`}
            >
              <Text style={[styles.openItemMore, { color: colors.warning }]}>
                +{extraTasks} more {extraTasks === 1 ? 'task' : 'tasks'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

// ── Checkbox option sub-component ────────────────────────────────────────────

function CheckboxOption({
  icon,
  label,
  description,
  checked,
  completed,
  onToggle,
  disabled,
  accentColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  checked: boolean;
  completed: boolean;
  onToggle: () => void;
  disabled: boolean;
  accentColor: string;
}) {
  const checkboxIcon = completed
    ? 'checkmark-circle'
    : checked
      ? 'radio-button-on'
      : 'radio-button-off';

  return (
    <TouchableOpacity
      style={[
        styles.checkboxRow,
        { borderColor: accentColor, backgroundColor: `${accentColor}18` },
        disabled && styles.checkboxRowDisabled,
      ]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
    >
      <Ionicons name={icon} size={32} color={accentColor} />
      <View style={styles.checkboxTextColumn}>
        <Text style={[styles.checkboxLabel, { color: accentColor }]}>{label}</Text>
        <Text style={styles.checkboxDescription}>{description}</Text>
      </View>
      <Ionicons name={checkboxIcon} size={26} color={accentColor} />
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

  // Scrollable content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Asset detail card
  assetCard: {
    marginTop: spacing.base,
  },

  // Location info
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: borderRadius.sm,
  },
  locationText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  locationName: {
    fontFamily: fonts.bold,
    color: colors.text,
  },

  // Tab container
  tabContainer: {
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },

  // Checkbox section
  checkboxSectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  checkboxList: {
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  checkboxRowDisabled: {
    opacity: 0.5,
  },
  checkboxTextColumn: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  checkboxDescription: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Open Items section
  openItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  openItemsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  openItemsCountBadge: {
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  openItemsCountText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },
  openItemsList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.base,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  openItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  openItemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  openItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openItemTextColumn: {
    flex: 1,
  },
  openItemTypeLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  openItemTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    marginTop: 1,
  },
  openItemStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  openItemStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openItemStatus: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  openItemMoreRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  openItemMore: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Confirm button
  confirmButton: {
    ...shadows.sm,
  },
});
