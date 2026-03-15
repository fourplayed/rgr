import React from 'react';
import { View, type StyleProp, type ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { sheetLayout } from '../../theme/sheetLayout';

interface SheetFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sticky footer for SheetModal consumers.
 *
 * Place after BottomSheetScrollView (inside the container View) so action
 * buttons are pinned to the bottom of the sheet regardless of scroll content
 * height. Automatically applies safe-area-aware bottom padding.
 *
 * Uses a gradient shadow above the footer instead of a hairline border for
 * the Elevated Depth treatment.
 */
export function SheetFooter({ children, style }: SheetFooterProps) {
  const paddingBottom = useSheetBottomPadding();

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(0, 0, 48, 0.04)', 'transparent']}
        style={styles.topShadow}
        pointerEvents="none"
      />
      <View style={[sheetLayout.footer, { paddingBottom }, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  topShadow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 4,
  },
});
