import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../common/Button';
import { BottomSheet } from '../common/BottomSheet';
import { colors } from '../../theme/colors';
import { spacing, fontSize, lineHeight, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';

interface SaveCredentialsModalProps {
  visible: boolean;
  onSave: () => void;
  onSkip: () => void;
}

export function SaveCredentialsModal({ visible, onSave, onSkip }: SaveCredentialsModalProps) {
  return (
    <BottomSheet visible={visible} onDismiss={onSkip}>
      <View style={styles.content}>
        <AppText style={styles.title}>Save Login?</AppText>

        <AppText style={styles.description}>
          Save your credentials for automatic login next time you open the app?
        </AppText>

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
    marginBottom: spacing.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: lineHeight.body,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
