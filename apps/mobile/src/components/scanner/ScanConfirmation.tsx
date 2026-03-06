import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, AssetWithRelations } from '@rgr/shared';
import { AssetInfoCard } from '../assets/AssetInfoCard';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import type { MatchedDepot } from '../../hooks/scan/useScanActionFlow';

// ── Types ────────────────────────────────────────────────────────────────────

export type ConfirmActions = {
  photo: boolean;
  defect: boolean;
  maintenance: boolean;
};

type ScanConfirmationProps =
  | {
      variant: 'driver';
      asset: Asset;
      matchedDepot: MatchedDepot | null;
      isCreating: boolean;
      onConfirm: (actions: ConfirmActions) => void;
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
      onConfirm: (actions: ConfirmActions) => void;
      onUndoPress: () => void;
      photoCompleted: boolean;
      defectCompleted: boolean;
      disabled: boolean;
      assessment?: string | null;
    };

// ── Component ────────────────────────────────────────────────────────────────

function ScanConfirmationComponent(props: ScanConfirmationProps) {
  const { asset, matchedDepot, isCreating, disabled } = props;

  // Build AssetWithRelations for AssetInfoCard
  const assetWithRelations: AssetWithRelations = {
    ...asset,
    depotName: matchedDepot?.depot.name ?? null,
    depotCode: matchedDepot?.depot.code ?? null,
    driverName: null,
    lastScannerName: null,
    photoCount: 0,
  };

  // Checkbox state for queued actions
  const [selectedPhoto, setSelectedPhoto] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(false);

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      <SheetHeader icon="cube" title="Asset Found" onClose={props.onUndoPress} disabled={disabled} />

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

      </ScrollView>

      {/* ── Pinned footer (outside ScrollView) ── */}
      <SheetFooter>
        {/* Action checkboxes */}
        <Text style={styles.checkboxSectionTitle}>Role Specific Options</Text>
        <View style={styles.checkboxList}>
          <CheckboxOption
            icon="camera"
            label="Photo"
            description="Capture a photo of the asset for visual records and condition tracking"
            checked={props.photoCompleted || selectedPhoto}
            completed={props.photoCompleted}
            onToggle={() => setSelectedPhoto(v => !v)}
            disabled={disabled || props.photoCompleted}
            accentColor={colors.violet}
          />
          {props.variant === 'mechanic' && (
            <>
              <CheckboxOption
                icon="warning"
                label="Defect"
                description="Log a defect report including severity, description, and optional photo evidence"
                checked={props.defectCompleted || selectedDefect}
                completed={props.defectCompleted}
                onToggle={() => setSelectedDefect(v => !v)}
                disabled={disabled || props.defectCompleted}
                accentColor={'#FACC15'}
              />
              <CheckboxOption
                icon="construct"
                label="Maintenance"
                description="Schedule a maintenance task with priority, assignee, and work details"
                checked={selectedMaintenance}
                completed={false}
                onToggle={() => setSelectedMaintenance(v => !v)}
                disabled={disabled}
                accentColor={colors.warning}
              />
            </>
          )}
        </View>

        {/* Done / Confirm button */}
        {(() => {
          const hasNewPhoto = selectedPhoto && !props.photoCompleted;
          const hasNewDefect = props.variant === 'mechanic' ? selectedDefect && !props.defectCompleted : false;
          const hasNewMaintenance = props.variant === 'mechanic' ? selectedMaintenance : false;
          const hasSelection = hasNewPhoto || hasNewDefect || hasNewMaintenance;
          const buttonColor = hasNewMaintenance
            ? colors.warning
            : hasNewDefect
              ? '#FACC15'
              : hasNewPhoto
                ? colors.violet
                : colors.success;
          return (
            <Button
              onPress={() => {
                props.onConfirm({
                  photo: hasNewPhoto,
                  defect: hasNewDefect,
                  maintenance: hasNewMaintenance,
                });
              }}
              disabled={disabled}
              style={styles.confirmButton}
              color={buttonColor}
              accessibilityLabel={hasSelection ? 'Confirm' : 'Done'}
            >
              {hasSelection ? 'CONFIRM' : 'DONE'}
            </Button>
          );
        })()}

      </SheetFooter>
    </View>
  );
}

// ── Context section sub-component ─────────────────────────────────────────────

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
      ? 'checkbox'
      : 'square-outline';

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
      accessibilityRole="checkbox"
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
    paddingBottom: spacing.base,
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
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  checkboxDescription: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Confirm button (separate, below action card)
  confirmButton: {
    marginTop: spacing.sm,
    ...shadows.sm,
  },

});
