import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../common/AppText';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts, borderRadius } from '../../theme/spacing';

interface BulkActionBarProps {
  selectedCount: number;
  onComplete: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: { completed: number; failed: number; total: number };
}

export function BulkActionBar({
  selectedCount,
  onComplete,
  onCancel,
  isProcessing,
  progress,
}: BulkActionBarProps) {
  return (
    <View style={styles.container}>
      {isProcessing ? (
        <AppText style={styles.progressText}>
          Completing {progress.completed + progress.failed} of {progress.total}...
        </AppText>
      ) : (
        <>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <AppText style={styles.cancelText}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onComplete}
            style={[styles.completeButton, selectedCount === 0 && styles.disabledButton]}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={`Complete ${selectedCount} selected items`}
            accessibilityState={{ disabled: selectedCount === 0 }}
          >
            <AppText style={styles.completeText}>Complete ({selectedCount})</AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.chrome,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
  completeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.success,
    borderRadius: borderRadius.base,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeText: {
    color: colors.textInverse,
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
  },
  progressText: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
});
