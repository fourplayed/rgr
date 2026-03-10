import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './spacing';

/**
 * Shared structural styles for sheet modals.
 *
 * - `container`     — 85% max height, for form sheets
 * - `containerTall` — 90% max height, for detail views
 * - `scroll`        — flex settings for the ScrollView itself
 * - `scrollContent` — horizontal padding only (paddingTop and gap vary per modal)
 *
 * paddingBottom is dynamic (safe area) — apply via useSheetBottomPadding().
 */
export const sheetLayout = StyleSheet.create({
  container: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  containerTall: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20, // spacing.lg
  },
  /** Gorhom handle indicator — single source of truth for sheet handles */
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
  },
});
