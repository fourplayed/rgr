import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import type { CountSummaryData } from './CameraOverlay';

interface CountSummarySheetProps {
  visible: boolean;
  countSummary: CountSummaryData;
  scanCount: number;
  onDismiss: () => void;
}

export function CountSummarySheet({
  visible,
  countSummary,
  scanCount,
  onDismiss,
}: CountSummarySheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={sheetStyles.backdrop}>
        <TouchableOpacity
          style={sheetStyles.backdropTouchable}
          activeOpacity={1}
          onPress={onDismiss}
        />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />

          <View style={sheetStyles.content}>
            <Text style={sheetStyles.title}>Count Summary</Text>

            <View style={sheetStyles.statsRow}>
              <View style={sheetStyles.statBox}>
                <Text style={sheetStyles.statValue}>{countSummary.standaloneCount}</Text>
                <Text style={sheetStyles.statLabel}>Standalone</Text>
              </View>
              <View style={sheetStyles.statDivider} />
              <View style={sheetStyles.statBox}>
                <Text style={sheetStyles.statValue}>{countSummary.combinationCount}</Text>
                <Text style={sheetStyles.statLabel}>Combinations</Text>
              </View>
              <View style={sheetStyles.statDivider} />
              <View style={sheetStyles.statBox}>
                <Text style={sheetStyles.statValue}>{scanCount}</Text>
                <Text style={sheetStyles.statLabel}>Total</Text>
              </View>
            </View>

            {countSummary.recentAssetNumbers.length > 0 && (
              <View style={sheetStyles.recentSection}>
                <Text style={sheetStyles.recentTitle}>Recent Scans</Text>
                {countSummary.recentAssetNumbers.map((num, i) => (
                  <View key={`${num}-${i}`} style={sheetStyles.recentItem}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={sheetStyles.recentText}>{num}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={sheetStyles.closeButton}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close summary"
            >
              <Text style={sheetStyles.closeButtonText}>Continue Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recentSection: {
    marginBottom: spacing.md,
  },
  recentTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recentText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  closeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
});
