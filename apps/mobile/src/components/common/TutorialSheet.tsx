import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, lineHeight, fontFamily as fonts } from '../../theme/spacing';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { IconCircle } from './IconCircle';

export interface TutorialSheetProps {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  bullets?: readonly string[];
  buttonLabel: string;
  onDismiss: () => void;
}

export const TutorialSheet = React.memo(function TutorialSheet({
  visible,
  icon,
  title,
  body,
  bullets,
  buttonLabel,
  onDismiss,
}: TutorialSheetProps) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <IconCircle icon={icon} color={colors.electricBlue} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {bullets && bullets.length > 0 && (
          <View style={styles.bulletContainer}>
            {bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        <Button onPress={onDismiss} style={styles.fullWidth} accessibilityLabel={buttonLabel}>
          {buttonLabel}
        </Button>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  body: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: lineHeight.body,
  },
  bulletContainer: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bulletDot: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    lineHeight: lineHeight.body,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: lineHeight.body,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
