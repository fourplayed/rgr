import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface SuccessItem {
  label: string;
  value?: string;
}

interface ScanSuccessSheetProps {
  visible: boolean;
  items: SuccessItem[];
  onDismiss: () => void;
}

export function ScanSuccessSheet({
  visible,
  items,
  onDismiss,
}: ScanSuccessSheetProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <Text style={styles.title}>Success</Text>

            <View style={styles.list}>
              {items.map((item) => (
                <View key={item.label} style={styles.listItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemLabel}>{item.label}</Text>
                    {item.value && (
                      <Text style={styles.listItemValue}>{item.value}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={onDismiss}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: spacing.lg,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  list: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  listItemText: {
    flex: 1,
  },
  listItemLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  listItemValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  doneButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
