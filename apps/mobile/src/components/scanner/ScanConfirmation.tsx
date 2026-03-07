import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, AssetWithRelations, AssetScanContext } from '@rgr/shared';
import { DefectStatusLabels, MaintenanceStatusLabels } from '@rgr/shared';
import { AssetInfoCard } from '../assets/AssetInfoCard';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import type { MatchedDepot } from '../../hooks/scan/useScanActionFlow';

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
      ? '#FACC15'
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
        bounces={true}
        showsVerticalScrollIndicator={false}
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
              Location automatically updated to <Text style={styles.locationName}>{matchedDepot.depot.name}</Text>
              {' '}({matchedDepot.distanceKm < 1
                ? `${Math.round(matchedDepot.distanceKm * 1000)}m away`
                : `${matchedDepot.distanceKm.toFixed(1)}km away`})
            </Text>
          </View>
        )}

        {/* Open Items (mechanic only) */}
        {props.variant === 'mechanic' && props.scanContext && (
          <OpenItemsSection
            scanContext={props.scanContext}
            onDefectPress={props.onDefectPress}
            onTaskPress={props.onTaskPress}
          />
        )}

        {/* Action options (single-select radio) */}
        <Text style={styles.checkboxSectionTitle}>Role Specific Options</Text>
        <View style={styles.checkboxList}>
          <CheckboxOption
            icon="camera"
            label="Capture Photo"
            description="Capture a photo of the asset for visual records and condition tracking"
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
                description="Log a defect report including severity, description, and optional photo evidence"
                checked={defectCompleted || selectedAction === 'defect'}
                completed={defectCompleted}
                onToggle={() => toggleAction('defect')}
                disabled={disabled || defectCompleted}
                accentColor={'#FACC15'}
              />
              <CheckboxOption
                icon="construct"
                label="Schedule Maintenance"
                description="Schedule a maintenance task with priority, assignee, and work details"
                checked={maintenanceCompleted || selectedAction === 'maintenance'}
                completed={maintenanceCompleted}
                onToggle={() => toggleAction('maintenance')}
                disabled={disabled || maintenanceCompleted}
                accentColor={colors.warning}
              />
            </>
          )}
        </View>

      </ScrollView>

      {/* ── Pinned footer (outside ScrollView) ── */}
      <SheetFooter>
        {/* Done / Confirm button */}
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
}: {
  scanContext: AssetScanContext;
  onDefectPress?: ((id: string) => void) | undefined;
  onTaskPress?: ((id: string) => void) | undefined;
}) {
  const { openDefects, activeTasks, openDefectCount, activeTaskCount } = scanContext;

  if (openDefectCount === 0 && activeTaskCount === 0) return null;

  const extraDefects = openDefectCount - openDefects.length;
  const extraTasks = activeTaskCount - activeTasks.length;

  return (
    <>
      <Text style={styles.checkboxSectionTitle}>Open Items</Text>
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
            <Ionicons name="warning" size={20} color="#FACC15" />
            <View style={styles.openItemTextColumn}>
              <Text style={styles.openItemTitle} numberOfLines={1}>{defect.title}</Text>
              <Text style={styles.openItemStatus}>{DefectStatusLabels[defect.status] ?? defect.status}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ))}
        {extraDefects > 0 && (
          <Text style={styles.openItemMore}>+{extraDefects} more open {extraDefects === 1 ? 'defect' : 'defects'}</Text>
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
            <Ionicons name="construct" size={20} color={colors.warning} />
            <View style={styles.openItemTextColumn}>
              <Text style={styles.openItemTitle} numberOfLines={1}>{task.title}</Text>
              <Text style={styles.openItemStatus}>{MaintenanceStatusLabels[task.status] ?? task.status}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ))}
        {extraTasks > 0 && (
          <Text style={styles.openItemMore}>+{extraTasks} more {extraTasks === 1 ? 'task' : 'tasks'}</Text>
        )}
      </View>
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
    paddingBottom: spacing.xl,
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
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  locationName: {
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },

  // Checkbox section
  checkboxSectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  checkboxList: {
    gap: spacing.md,
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
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  checkboxDescription: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Open Items section
  openItemsList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  openItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  openItemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  openItemTextColumn: {
    flex: 1,
  },
  openItemTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  openItemStatus: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: 1,
  },
  openItemMore: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: '#94A3B8',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    textAlign: 'center',
  },

  // Confirm button (separate, below action card)
  confirmButton: {
    marginTop: -spacing.sm,
    ...shadows.sm,
  },

});
