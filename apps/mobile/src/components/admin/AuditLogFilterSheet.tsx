import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';

const ACTION_TYPES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const;

/** Validates YYYY-MM-DD format and that the date is a real calendar date */
function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  // Verify the parsed date matches input (catches Feb 30, etc.)
  return (
    d.getFullYear() === Number(s.slice(0, 4)) &&
    d.getMonth() + 1 === Number(s.slice(5, 7)) &&
    d.getDate() === Number(s.slice(8, 10))
  );
}

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
  const [dateError, setDateError] = useState('');

  const filtersAction = filters.action;
  const filtersStartDate = filters.startDate;
  const filtersEndDate = filters.endDate;

  useEffect(() => {
    if (visible) {
      setAction(filtersAction);
      setStartDate(filtersStartDate || '');
      setEndDate(filtersEndDate || '');
      setDateError('');
    }
  }, [visible, filtersAction, filtersStartDate, filtersEndDate]);

  const handleStartDateChange = (text: string) => {
    setStartDate(text);
    setDateError('');
  };

  const handleEndDateChange = (text: string) => {
    setEndDate(text);
    setDateError('');
  };

  const handleApply = () => {
    if (startDate && !isValidDate(startDate)) {
      setDateError('Start date must be YYYY-MM-DD');
      return;
    }
    if (endDate && !isValidDate(endDate)) {
      setDateError('End date must be YYYY-MM-DD');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start date must be before end date');
      return;
    }
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
    setDateError('');
    onApply({});
  };

  return (
    <BottomSheet visible={visible} onDismiss={onClose}>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
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
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setAction(isSelected ? undefined : type)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${type}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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
            <BottomSheetTextInput
              style={[styles.dateInput, dateError ? styles.dateInputError : undefined]}
              value={startDate}
              onChangeText={handleStartDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              maxLength={10}
              accessibilityLabel="Start date"
            />
            <Text style={styles.dateSeparator}>to</Text>
            <BottomSheetTextInput
              style={[styles.dateInput, dateError ? styles.dateInputError : undefined]}
              value={endDate}
              onChangeText={handleEndDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              maxLength={10}
              accessibilityLabel="End date"
            />
          </View>
          {dateError ? <Text style={styles.dateErrorText}>{dateError}</Text> : null}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button variant="secondary" onPress={handleClear} flex>
            Clear
          </Button>
          <Button onPress={handleApply} flex>
            Apply
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
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
    borderRadius: borderRadius.full,
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
    fontFamily: fonts.regular,
    color: colors.text,
    textTransform: 'uppercase',
  },
  chipTextSelected: {
    fontFamily: fonts.bold,
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
    fontFamily: fonts.regular,
    color: colors.text,
  },
  dateSeparator: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  dateInputError: {
    borderColor: colors.error,
  },
  dateErrorText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
