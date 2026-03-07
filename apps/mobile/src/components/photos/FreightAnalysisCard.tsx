import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FreightAnalysis, HazardAlert, HazardSeverity } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

interface FreightAnalysisCardProps {
  analysis: FreightAnalysis;
  hazards: HazardAlert[];
}

function FreightAnalysisCardComponent({ analysis, hazards }: FreightAnalysisCardProps) {
  const confidencePercent = analysis.confidence ? Math.round(analysis.confidence * 100) : null;
  const loadScore = analysis.loadDistributionScore
    ? Math.round(analysis.loadDistributionScore * 100)
    : null;

  const getSeverityColor = (severity: HazardSeverity | null): string => {
    if (severity === null) return colors.textSecondary;
    return colors.hazardSeverity[severity] ?? colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={20} color={colors.electricBlue} />
        <Text style={styles.headerTitle}>Freight Analysis</Text>
      </View>

      {/* Primary category */}
      {analysis.primaryCategory && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>Category</Text>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryValue}>{analysis.primaryCategory.replace(/_/g, ' ')}</Text>
            {confidencePercent !== null && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{confidencePercent}%</Text>
              </View>
            )}
          </View>
          {analysis.description && <Text style={styles.description}>{analysis.description}</Text>}
        </View>
      )}

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {analysis.estimatedWeightKg != null && (
          <View style={styles.statItem}>
            <Ionicons name="scale-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{analysis.estimatedWeightKg.toLocaleString()} kg</Text>
            <Text style={styles.statLabel}>Est. Weight</Text>
          </View>
        )}

        {loadScore !== null && (
          <View style={styles.statItem}>
            <Ionicons name="layers-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{loadScore}%</Text>
            <Text style={styles.statLabel}>Load Score</Text>
          </View>
        )}

        {analysis.restraintCount != null && (
          <View style={styles.statItem}>
            <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{analysis.restraintCount}</Text>
            <Text style={styles.statLabel}>Restraints</Text>
          </View>
        )}
      </View>

      {/* Hazard summary */}
      {hazards.length > 0 && (
        <View style={styles.hazardSection}>
          <View style={styles.hazardHeader}>
            <Ionicons name="warning" size={18} color={getSeverityColor(analysis.maxSeverity)} />
            <Text style={styles.hazardTitle}>
              {hazards.length} Hazard{hazards.length !== 1 ? 's' : ''} Detected
            </Text>
          </View>

          {hazards.slice(0, 3).map((hazard) => (
            <View key={hazard.id} style={styles.hazardItem}>
              <View
                style={[
                  styles.hazardSeverityDot,
                  { backgroundColor: getSeverityColor(hazard.severity) },
                ]}
              />
              <View style={styles.hazardContent}>
                <Text style={styles.hazardType}>{hazard.hazardType.replace(/_/g, ' ')}</Text>
                <Text style={styles.hazardDescription} numberOfLines={2}>
                  {hazard.description}
                </Text>
              </View>
            </View>
          ))}

          {hazards.length > 3 && <Text style={styles.moreHazards}>+{hazards.length - 3} more</Text>}
        </View>
      )}

      {/* Blocking status */}
      {(analysis.requiresAcknowledgment || analysis.blockedFromDeparture) && (
        <View style={styles.statusSection}>
          {analysis.blockedFromDeparture && (
            <View style={[styles.statusBadge, styles.blockedBadge]}>
              <Ionicons name="hand-left" size={14} color={colors.textInverse} />
              <Text style={styles.blockedText}>Departure Blocked</Text>
            </View>
          )}
          {analysis.requiresAcknowledgment && !analysis.blockedFromDeparture && (
            <View style={[styles.statusBadge, styles.acknowledgeBadge]}>
              <Ionicons name="alert-circle" size={14} color={colors.textInverse} />
              <Text style={styles.acknowledgeText}>Acknowledgment Required</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export const FreightAnalysisCard = memo(FreightAnalysisCardComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categorySection: {
    gap: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryValue: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'capitalize',
  },
  confidenceBadge: {
    backgroundColor: colors.electricBlue,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  statValue: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  hazardSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hazardTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  hazardSeverityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  hazardContent: {
    flex: 1,
  },
  hazardType: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  hazardDescription: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  moreHazards: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
    fontStyle: 'italic',
  },
  statusSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  blockedBadge: {
    backgroundColor: colors.error,
  },
  blockedText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  acknowledgeBadge: {
    backgroundColor: colors.warning,
  },
  acknowledgeText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
