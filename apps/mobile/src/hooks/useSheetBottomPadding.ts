import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';

/**
 * Returns bottom padding for sheet modal scroll content.
 * Matches the BottomSheet formula: Math.max(insets.bottom, spacing['2xl']).
 */
export function useSheetBottomPadding(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, spacing['2xl']);
}
