import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { BottomSheetScrollView } from '../common/SheetModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Asset, AssetWithRelations, AssetScanContext } from '@rgr/shared';
import { formatRelativeTime } from '@rgr/shared';
import { AssetInfoCard } from '../assets/AssetInfoCard';
import { DefectStatusBadge } from '../maintenance/DefectStatusBadge';
import { cardStyles } from '../maintenance/maintenance.styles';
import { Button } from '../common/Button';
import { SheetHeader } from '../common/SheetHeader';
import { SegmentedTabs } from '../common/SegmentedTabs';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';
import { SheetFooter } from '../common/SheetFooter';
import { useTabFade } from '../../hooks/useTabFade';
import type { MatchedDepot, ConfirmAction } from '../../hooks/scan/scanFlowMachine';
import { AppText } from '../common';

// Re-export for any consumers that still import from here
export type { ConfirmAction } from '../../hooks/scan/scanFlowMachine';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Tab configuration ─────────────────────────────────────────────────────────

type ScanTab = 'actions' | 'openItems';

// ── Types ────────────────────────────────────────────────────────────────────

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
  const assetWithRelations = useMemo<AssetWithRelations>(
    () => ({
      ...asset,
      depotName: matchedDepot?.depot.name ?? null,
      depotCode: matchedDepot?.depot.code ?? null,
      driverName: null,
      lastScannerName: null,
      photoCount: 0,
    }),
    [asset, matchedDepot]
  );

  // Single-select action state (radio behavior)
  const [selectedAction, setSelectedAction] = useState<ConfirmAction>(null);
  const [activeTab, setActiveTab] = useState<ScanTab>('actions');

  // Track the maximum tab content height so the modal never shrinks on tab switch.
  // gorhom's enableDynamicSizing re-measures on layout changes — if the new tab is
  // shorter, the sheet visibly collapses. Applying minHeight prevents this.
  const maxTabHeightRef = useRef(0);
  const [minTabHeight, setMinTabHeight] = useState(0);

  const handleTabContentLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      if (h > maxTabHeightRef.current) {
        maxTabHeightRef.current = h;
        setMinTabHeight(h);
      }
    },
    []
  );

  // Reset selection when a new scan starts (component stays mounted via displayAsset ref)
  useEffect(() => {
    if (isCreating) {
      setSelectedAction(null);
      setActiveTab('actions');
      maxTabHeightRef.current = 0;
      setMinTabHeight(0);
    }
  }, [isCreating]);
  const tabFade = useTabFade(activeTab);

  // Show tabs only for mechanics with existing open items
  const openItemCount =
    props.variant === 'mechanic' && props.scanContext != null
      ? props.scanContext.openDefectCount + props.scanContext.activeTaskCount
      : 0;
  const hasOpenItems = openItemCount > 0;

  const scanTabs = useMemo(
    () => [
      { key: 'actions' as const, label: 'Actions' },
      { key: 'openItems' as const, label: `Open Items (${openItemCount})` },
    ],
    [openItemCount]
  );

  const toggleAction = useCallback((action: ConfirmAction) => {
    Haptics.selectionAsync();
    setSelectedAction((prev) => (prev === action ? null : action));
  }, []);

  // Derive completed states
  const defectCompleted = props.variant === 'mechanic' ? props.defectCompleted : false;
  const maintenanceCompleted = props.variant === 'mechanic' ? props.maintenanceCompleted : false;

  // Button color matches selected action
  const buttonColor =
    selectedAction === 'maintenance'
      ? colors.warning
      : selectedAction === 'defect'
        ? colors.defectYellow
        : selectedAction === 'photo'
          ? colors.electricBlue
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
      <SheetHeader
        icon="checkmark-circle"
        title="Asset Found"
        onClose={props.onUndoPress}
        backgroundColor={colors.success}
      />

      {/* ── Scrollable content ── */}
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
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
            <AppText style={styles.locationText}>
              Location updated to{' '}
              <AppText style={styles.locationName}>{matchedDepot.depot.name}</AppText> (
              {matchedDepot.distanceKm < 1
                ? `${Math.round(matchedDepot.distanceKm * 1000)}m away`
                : `${matchedDepot.distanceKm.toFixed(1)}km away`}
              )
            </AppText>
          </View>
        )}

        {/* ── Tabbed layout (mechanic with open items) or flat actions ── */}
        {props.variant === 'mechanic' && hasOpenItems ? (
          <>
            <View style={styles.tabContainer}>
              <SegmentedTabs tabs={scanTabs} activeTab={activeTab} onTabPress={setActiveTab} />
            </View>
            <Animated.View
              style={[tabFade, minTabHeight > 0 && { minHeight: minTabHeight }]}
              onLayout={handleTabContentLayout}
            >
              {activeTab === 'actions' ? (
                <View style={styles.checkboxList}>
                  <CheckboxOption
                    icon="camera"
                    label="Capture Photo"
                    description="Timestamped photo for records"
                    checked={props.photoCompleted || selectedAction === 'photo'}
                    completed={props.photoCompleted}
                    onToggle={() => toggleAction('photo')}
                    disabled={disabled || props.photoCompleted}
                    accentColor={colors.electricBlue}
                  />
                  <CheckboxOption
                    icon="warning"
                    label="Report Defect"
                    description="Log damage with details and photo"
                    checked={defectCompleted || selectedAction === 'defect'}
                    completed={defectCompleted}
                    onToggle={() => toggleAction('defect')}
                    disabled={disabled || defectCompleted}
                    accentColor={colors.defectYellow}
                  />
                  <CheckboxOption
                    icon="construct"
                    label="Schedule Maintenance"
                    description="Create a task with priority"
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
            </Animated.View>
          </>
        ) : (
          <>
            <AppText style={styles.checkboxSectionTitle}>Actions</AppText>
            <View style={styles.checkboxList}>
              <CheckboxOption
                icon="camera"
                label="Capture Photo"
                description="Timestamped photo for records"
                checked={props.photoCompleted || selectedAction === 'photo'}
                completed={props.photoCompleted}
                onToggle={() => toggleAction('photo')}
                disabled={disabled || props.photoCompleted}
                accentColor={colors.electricBlue}
              />
              {props.variant === 'mechanic' && (
                <>
                  <CheckboxOption
                    icon="warning"
                    label="Report Defect"
                    description="Log damage with details and photo"
                    checked={defectCompleted || selectedAction === 'defect'}
                    completed={defectCompleted}
                    onToggle={() => toggleAction('defect')}
                    disabled={disabled || defectCompleted}
                    accentColor={colors.defectYellow}
                  />
                  <CheckboxOption
                    icon="construct"
                    label="Schedule Maintenance"
                    description="Create a task with priority"
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
      </BottomSheetScrollView>

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

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
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
          <AppText style={styles.checkboxSectionTitle}>Open Items</AppText>
          <View style={styles.openItemsHeaderRight}>
            <View style={styles.openItemsCountBadge}>
              <AppText style={styles.openItemsCountText}>{totalCount}</AppText>
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
        <View style={styles.openItemsCardList}>
          {/* Defect cards */}
          {openDefects.map((defect) => (
            <TouchableOpacity
              key={defect.id}
              style={[
                cardStyles.containerInline,
                {
                  borderLeftColor: colors.defectYellow,
                  backgroundColor: colors.defectYellow + '08',
                },
              ]}
              onPress={() => onDefectPress?.(defect.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Defect: ${defect.title}`}
            >
              <View style={cardStyles.cardRow}>
                <View style={cardStyles.cardIconContainer}>
                  <Ionicons name="warning" size={32} color={colors.defectYellow} />
                </View>
                <View style={cardStyles.cardBody}>
                  <View style={cardStyles.cardContentRow}>
                    <AppText
                      style={[cardStyles.cardTitle, { color: colors.defectYellow }]}
                      numberOfLines={1}
                    >
                      Defect Report
                    </AppText>
                    <View style={cardStyles.cardBadges}>
                      <DefectStatusBadge status={defect.status} color={colors.defectYellow} />
                    </View>
                  </View>
                  <View style={cardStyles.cardFooter}>
                    <AppText style={cardStyles.cardSecondaryText} numberOfLines={1}>
                      {defect.description ?? defect.title}
                    </AppText>
                    <AppText style={cardStyles.cardTime}>
                      {formatRelativeTime(defect.createdAt)}
                    </AppText>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {/* Maintenance task cards */}
          {activeTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                cardStyles.containerInline,
                {
                  borderLeftColor: colors.warning,
                  backgroundColor: colors.warning + '08',
                },
              ]}
              onPress={() => onTaskPress?.(task.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Task: ${task.title}`}
            >
              <View style={cardStyles.cardRow}>
                <View style={cardStyles.cardIconContainer}>
                  <Ionicons name="construct" size={32} color={colors.warning} />
                </View>
                <View style={cardStyles.cardBody}>
                  <View style={cardStyles.cardContentRow}>
                    <AppText style={cardStyles.cardTitle} numberOfLines={1}>
                      Maintenance Task
                    </AppText>
                  </View>
                  <View style={cardStyles.cardFooter}>
                    <AppText style={cardStyles.cardSecondaryText} numberOfLines={1}>
                      {task.title}
                    </AppText>
                    <AppText style={cardStyles.cardTime}>
                      {formatRelativeTime(task.createdAt)}
                    </AppText>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

// ── Gradient endpoint lookup for CheckboxOption ──────────────────────────────

const GRADIENT_ENDPOINTS: Record<string, string> = {
  [colors.electricBlue]: colors.gradientEndpoints.electricBlue,
  [colors.defectYellow]: colors.gradientEndpoints.defectYellow,
  [colors.warning]: colors.gradientEndpoints.warning,
};

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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = useCallback(() => {
    onToggle();
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [onToggle, scaleAnim]);

  // Determine border and shadow styles based on state
  const isSelected = checked && !completed;
  const isUnselected = !checked && !completed;

  const dynamicRowStyle = [
    styles.checkboxRow,
    isSelected && {
      borderColor: accentColor,
      borderWidth: 1.5,
      shadowColor: accentColor,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
    },
    isUnselected && {
      borderColor: `${accentColor}66`,
    },
    completed && {
      borderColor: accentColor,
    },
    disabled && styles.checkboxRowDisabled,
  ];

  const gradientEnd = GRADIENT_ENDPOINTS[accentColor] ?? accentColor;

  // Radio indicator
  const renderRadioIndicator = () => {
    if (completed) {
      return <Ionicons name="checkmark-circle" size={24} color={accentColor} />;
    }
    if (checked) {
      return (
        <View style={{ width: 24, height: 24, borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient
            colors={[accentColor, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 24, height: 24, borderRadius: 12 }}
          />
        </View>
      );
    }
    return <Ionicons name="radio-button-off" size={24} color={accentColor} />;
  };

  return (
    <Pressable
      onPress={handleToggle}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
    >
      <Animated.View style={[dynamicRowStyle, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={[`${accentColor}1A`, `${accentColor}0A`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: borderRadius.md }]}
        />
        <Ionicons
          name={icon}
          size={24}
          color={accentColor}
          style={isUnselected ? { opacity: 0.7 } : undefined}
        />
        <View style={styles.checkboxTextColumn}>
          <AppText style={[styles.checkboxLabel, { color: accentColor }]}>{label}</AppText>
          <AppText style={styles.checkboxDescription}>{description}</AppText>
        </View>
        {renderRadioIndicator()}
      </Animated.View>
    </Pressable>
  );
}

export const ScanConfirmation = React.memo(ScanConfirmationComponent);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },

  // Scrollable content
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
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
    borderRadius: borderRadius.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
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
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  // Checkbox section
  checkboxSectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkboxList: {
    gap: spacing.base,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    overflow: 'hidden',
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
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },
  openItemsCardList: {
    gap: spacing.sm,
  },

  // Confirm button
  confirmButton: {
    ...shadows.sm,
  },
});
