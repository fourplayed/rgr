import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

interface SaveCredentialsModalProps {
  visible: boolean;
  onSave: () => void;
  onSkip: () => void;
}

export function SaveCredentialsModal({ visible, onSave, onSkip }: SaveCredentialsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Dismiss save login prompt"
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <Text style={styles.title}>Save Login?</Text>

            <Text style={styles.description}>
              Save your credentials for automatic login next time you open the app?
            </Text>

            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                onPress={onSkip}
                flex
                accessibilityLabel="Skip saving login credentials"
              >
                Not Now
              </Button>

              <Button onPress={onSave} flex accessibilityLabel="Save login credentials">
                Save
              </Button>
            </View>
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
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
