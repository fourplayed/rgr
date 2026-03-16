import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';

/**
 * Returns bottom padding for sheet modal scroll content.
 * Uses insets.bottom + extra buffer so content clears the home indicator
 * on devices with dynamic-sizing sheets.
 */
export function useSheetBottomPadding(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom + spacing.lg, spacing['3xl']);
}
