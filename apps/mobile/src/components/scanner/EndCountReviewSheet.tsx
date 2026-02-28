import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import type { AssetScan, CombinationGroup } from '@rgr/shared';
import { isStandaloneScan } from '@rgr/shared';

interface EndCountReviewSheetProps {
  visible: boolean;
  depotName: string;
  scans: AssetScan[];
  combinations: Record<string, CombinationGroup>;
  isSubmitting: boolean;
  onEditCombination?: (combinationId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDiscard: () => void;
  onDismiss?: () => void;
}

function EndCountReviewSheetComponent({
  visible,
  depotName,
  scans,
  combinations,
  isSubmitting,
  onEditCombination,
  onSubmit,
  onCancel,
  onDiscard,
  onDismiss,
}: EndCountReviewSheetProps) {
  // Compute standalone scans and combination info
  const { standaloneScans, combinationList } = useMemo(() => {
    const standalone = scans.filter(isStandaloneScan);
    const combos = Object.values(combinations);
    return {
      standaloneScans: standalone,
      combinationList: combos,
    };
  }, [scans, combinations]);

  const totalAssets = scans.length;
  const totalCombinations = combinationList.length;
  const standaloneCount = standaloneScans.length;

  // Check for missing data
  const combinationsWithoutPhoto = combinationList.filter(c => !c.photoUri);
  const hasWarnings = combinationsWithoutPhoto.length > 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onDismiss={onDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onCancel}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Review Count</Text>
              <Text style={styles.subtitle}>{depotName}</Text>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalAssets}</Text>
                <Text style={styles.statLabel}>Total Assets</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{standaloneCount}</Text>
                <Text style={styles.statLabel}>Standalone</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalCombinations}</Text>
                <Text style={styles.statLabel}>Combinations</Text>
              </View>
            </View>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Combinations Section */}
              {combinationList.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Combinations</Text>
                  {combinationList.map((combo) => (
                    <View key={combo.combinationId} style={styles.combinationCard}>
                      <View style={styles.combinationHeader}>
                        <View style={styles.combinationAssets}>
                          <Ionicons name="link" size={16} color={colors.electricBlue} />
                          <Text style={styles.combinationText}>
                            {combo.assetNumbers.join(' + ')}
                          </Text>
                        </View>
                        {onEditCombination && (
                          <TouchableOpacity
                            style={[
                              styles.editButton,
                              !combo.photoUri && styles.addPhotoButton,
                            ]}
                            onPress={() => onEditCombination(combo.combinationId)}
                          >
                            <Ionicons
                              name={combo.photoUri ? 'pencil' : 'camera'}
                              size={14}
                              color={combo.photoUri ? colors.electricBlue : colors.textInverse}
                            />
                            {!combo.photoUri && (
                              <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.combinationStatus}>
                        {/* Photo status */}
                        <View style={styles.statusItem}>
                          <Ionicons
                            name={combo.photoUri ? 'checkmark-circle' : 'alert-circle'}
                            size={14}
                            color={combo.photoUri ? colors.success : colors.warning}
                          />
                          <Text style={[
                            styles.statusText,
                            !combo.photoUri && styles.statusTextWarning
                          ]}>
                            {combo.photoUri ? 'Photo added' : 'No photo'}
                          </Text>
                        </View>

                        {/* Notes status */}
                        <View style={styles.statusItem}>
                          <Ionicons
                            name={combo.notes ? 'checkmark-circle' : 'remove-circle-outline'}
                            size={14}
                            color={combo.notes ? colors.success : colors.textSecondary}
                          />
                          <Text style={styles.statusText}>
                            {combo.notes ? 'Notes added' : 'No notes'}
                          </Text>
                        </View>
                      </View>

                      {combo.notes && (
                        <Text style={styles.combinationNotes} numberOfLines={2}>
                          {combo.notes}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Standalone Assets Section */}
              {standaloneScans.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Standalone Assets</Text>
                  <View style={styles.assetGrid}>
                    {standaloneScans.map((scan) => (
                      <View key={scan.assetId} style={styles.assetChip}>
                        <Text style={styles.assetChipText}>{scan.assetNumber}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Warning */}
            {hasWarnings && (
              <View style={styles.warningBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.warning} />
                <Text style={styles.warningText}>
                  {combinationsWithoutPhoto.length} combination{combinationsWithoutPhoto.length > 1 ? 's' : ''} missing photo
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Continue Counting</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoadingDots color={colors.textInverse} size={8} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color={colors.textInverse} />
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Discard */}
            <TouchableOpacity
              style={styles.discardButton}
              onPress={() => {
                Alert.alert(
                  'Discard Count',
                  `Are you sure you want to discard this count? ${totalAssets} scanned asset${totalAssets !== 1 ? 's' : ''} will be lost.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: onDiscard },
                  ],
                );
              }}
              disabled={isSubmitting}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={styles.discardButtonText}>Discard Count</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const EndCountReviewSheet = memo(EndCountReviewSheetComponent);

const styles = StyleSheet.create({
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
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
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

  // Scroll content
  scrollContent: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Combination card
  combinationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.electricBlue,
  },
  combinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  combinationAssets: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  combinationText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  editButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.electricBlue + '15',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addPhotoButton: {
    backgroundColor: colors.electricBlue,
    paddingHorizontal: spacing.md,
  },
  addPhotoButtonText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  combinationStatus: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  statusTextWarning: {
    color: colors.warning,
  },
  combinationNotes: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },

  // Asset grid
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  assetChip: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetChipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },

  // Warning
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  warningText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.warning,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  submitButton: {
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  discardButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
  },
});
