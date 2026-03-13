import React, { useState, useCallback } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatDate } from '@rgr/shared';
import { AppText } from './AppText';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

export interface DatePickerFieldProps {
  value: string; // ISO 'YYYY-MM-DD' or '' for no selection
  onChange: (date: string) => void;
  minimumDate?: Date; // undefined = no minimum (edit mode)
  placeholder?: string; // field placeholder text
  /** Fires when the inline calendar expands or collapses (iOS only). */
  onExpandedChange?: (expanded: boolean) => void;
}

export function DatePickerField({
  value,
  onChange,
  minimumDate,
  placeholder = 'Tap to select date',
  onExpandedChange,
}: DatePickerFieldProps) {
  const [expanded, setExpanded] = useState(false);
  // Android-only: controls native modal visibility
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const dateValue = value ? new Date(value + 'T00:00:00') : new Date();

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowAndroidPicker(false);
      }
      if (selectedDate) {
        const iso = selectedDate.toISOString().slice(0, 10);
        onChange(iso);
        Haptics.selectionAsync();

        // iOS: auto-collapse after a short delay for visual feedback
        if (Platform.OS === 'ios') {
          setTimeout(() => {
            setExpanded(false);
            onExpandedChange?.(false);
          }, 350);
        }
      }
    },
    [onChange, onExpandedChange]
  );

  const handleFieldPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      setExpanded((prev) => {
        const next = !prev;
        onExpandedChange?.(next);
        return next;
      });
    } else {
      setShowAndroidPicker(true);
    }
  }, [onExpandedChange]);

  return (
    <View>
      {/* Tappable field */}
      <Pressable
        style={styles.field}
        onPress={handleFieldPress}
        accessibilityRole="button"
        accessibilityLabel="Select date"
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? colors.text : colors.textSecondary}
        />
        <AppText style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
          {value ? formatDate(value) : placeholder}
        </AppText>
        {Platform.OS === 'ios' && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        )}
      </Pressable>

      {/* iOS: collapsible inline calendar */}
      {Platform.OS === 'ios' && expanded && (
        <View style={styles.calendarContainer}>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="inline"
            {...(minimumDate != null && { minimumDate })}
            onChange={handleDateChange}
            accentColor={colors.primary}
          />
        </View>
      )}

      {/* Android: native modal picker */}
      {Platform.OS === 'android' && showAndroidPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          {...(minimumDate != null && { minimumDate })}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    minHeight: 48,
  },
  fieldText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  fieldPlaceholder: {
    color: colors.textSecondary,
  },
  calendarContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    padding: spacing.xs,
  },
});
