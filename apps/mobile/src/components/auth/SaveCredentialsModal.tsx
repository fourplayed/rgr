import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../common/Button';
import { BottomSheet } from '../common/BottomSheet';
import { colors } from '../../theme/colors';
import { spacing, fontSize, lineHeight, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';
import { SheetHeader } from '../common/SheetHeader';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';

interface SaveCredentialsModalProps {
  visible: boolean;
  onSave: () => void;
  onSkip: () => void;
}

export function SaveCredentialsModal({ visible, onSave, onSkip }: SaveCredentialsModalProps) {
  const sheetBottomPadding = useSheetBottomPadding();

  return (
    <BottomSheet visible={visible} onDismiss={onSkip}>
      <SheetHeader
        icon="key-outline"
        title="Save Login?"
        onClose={onSkip}
        backgroundColor={colors.primary}
      />
      <View style={[styles.content, { paddingBottom: sheetBottomPadding }]}>
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
