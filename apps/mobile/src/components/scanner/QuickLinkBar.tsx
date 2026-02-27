import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface QuickLinkBarProps {
  visible: boolean;
  currentAssetNumber: string;
  previousAssetNumber: string;
  onLink: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function QuickLinkBar({
  visible,
  currentAssetNumber,
  previousAssetNumber,
  onLink,
  onDismiss,
  autoDismissMs = 5000,
}: QuickLinkBarProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, autoDismissMs, onDismiss, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <Ionicons name="link" size={16} color={colors.electricBlue} />
        <Text style={styles.text} numberOfLines={1}>
          Link {currentAssetNumber} to {previousAssetNumber}?
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={onLink}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="link" size={14} color={colors.textInverse} />
          <Text style={styles.linkButtonText}>Link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.base,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.electricBlue + '30',
    borderWidth: 1,
    borderColor: colors.electricBlue + '50',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  text: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.electricBlue,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  linkButtonText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  dismissButton: {
    padding: spacing.xs,
  },
});
