import { StyleSheet } from 'react-native';
import { borderRadius } from './spacing';

/**
 * Shared structural styles for sheet modals.
 *
 * Background color and rounded corners are owned by gorhom's backgroundStyle
 * — never add backgroundColor or borderRadius to these containers.
 *
 * - `container`        — flex fill for full sheets (90% snap point)
 * - `containerTall`    — alias for container (kept for consumer compatibility)
 * - `containerCompact` — content-sized for dynamic-sizing sheets (no flex: 1)
 * - `scroll`           — flex settings for the BottomSheetScrollView
 * - `scrollContent`    — horizontal padding (paddingTop/gap vary per modal)
 *
 * paddingBottom is dynamic (safe area) — apply via useSheetBottomPadding().
 */
export const sheetLayout = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  containerTall: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  containerCompact: {
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20, // spacing.lg
  },
});
