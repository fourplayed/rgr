import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing, borderRadius } from './spacing';

/**
 * Shared card styles for field-worker list items (assets, maintenance, defects).
 *
 * These use the "Tier 1" card treatment: left-accent only (`borderLeftWidth: 4`)
 * + `borderRadius.md` for information-dense lists. Admin cards (UserListItem,
 * DepotListItem) use Tier 2: `borderWidth: 2` + `borderRadius.lg` for visual prominence.
 *
 * - `container`       — includes marginBottom for FlatList usage
 * - `containerInline` — no marginBottom, for gap-managed scroll lists
 */
/**
 * Shared sheet container style for bottom sheet modals.
 * Used by MaintenanceDetailModal, DefectReportDetailModal,
 * CreateMaintenanceModal, SecurityModal, EditProfileModal, etc.
 */
export function sheetContainerStyle(maxHeight: string = '85%') {
  return {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    maxHeight,
  };
}

export const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  containerInline: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    borderLeftWidth: 4,
  },
});
