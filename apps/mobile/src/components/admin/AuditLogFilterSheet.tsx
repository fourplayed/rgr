import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const ACTION_TYPES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const;

export interface AuditLogFilters {
  action?: string;
  startDate?: string;
  endDate?: string;
}

interface AuditLogFilterSheetProps {
  visible: boolean;
  filters: AuditLogFilters;
  onApply: (filters: AuditLogFilters) => void;
  onClose: () => void;
}

export function AuditLogFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: AuditLogFilterSheetProps) {
  const [action, setAction] = useState<string | undefined>(filters.action);
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');

  const filtersAction = filters.action;
  const filtersStartDate = filters.startDate;
  const filtersEndDate = filters.endDate;

  useEffect(() => {
    if (visible) {
      setAction(filtersAction);
      setStartDate(filtersStartDate || '');
      setEndDate(filtersEndDate || '');
    }
  }, [visible, filtersAction, filtersStartDate, filtersEndDate]);

  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

  const handleApply = () => {
    if (startDate && !isValidDate(startDate)) return;
    if (endDate && !isValidDate(endDate)) return;
    if (startDate && endDate && startDate > endDate) return;
    const next: AuditLogFilters = {};
    if (action) next.action = action;
    if (startDate) next.startDate = startDate;
    if (endDate) next.endDate = endDate;
    onApply(next);
  };

  const handleClear = () => {
    setAction(undefined);
    setStartDate('');
    setEndDate('');
    onApply({});
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Filters</Text>

            {/* Action Type */}
            <View style={styles.section}>
              <Text style={styles.label}>Action Type</Text>
              <View style={styles.chipContainer}>
                {ACTION_TYPES.map((type) => {
                  const isSelected = action === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      onPress={() =>
                        setAction(isSelected ? undefined : type)
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${type}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.section}>
              <Text style={styles.label}>Date Range</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={styles.dateInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={10}
                  accessibilityLabel="Start date"
                />
                <Text style={styles.dateSeparator}>to</Text>
                <TextInput
                  style={styles.dateInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={10}
                  accessibilityLabel="End date"
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={handleClear}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.applyButton]}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

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
    paddingBottom: spacing['2xl'],
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
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.electricBlue,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    textTransform: 'uppercase',
  },
  chipTextSelected: {
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  dateSeparator: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  applyButton: {
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  applyButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
