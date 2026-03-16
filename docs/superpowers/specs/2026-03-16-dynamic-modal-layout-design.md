# Modal Layout Refactor — Inline Buttons, No Scroll, No Footer

**Date:** 2026-03-16
**Status:** Approved (revised after spec review)

## Problem

Modals flowing from the scan tab, asset, maintenance, and defect screens have buttons that are invisible — clipped by `overflow: hidden` on `flex:1` containers when content exceeds the snap point boundary. Previous fix attempts (raising snap points) did not resolve the issue.

## Solution

Refactor all 7 in-scope modals to: no scroll views, no sticky footers, buttons always inline in the content flow. Use `containerCompact` (no `flex:1`) so content is measured by intrinsic height.

**Hybrid sizing strategy** (due to gorhom v5 constraint: `enableDynamicSizing` + `BottomSheetTextInput` causes a measurement feedback loop — documented in SheetModal.tsx JSDoc):

- **Dynamic sizing** — modals without text inputs (gorhom measures content)
- **Fixed high snap points** — modals with text inputs (tall enough to fit all content + buttons)

## Scope

| Modal | File | Has TextInput | Sizing | Snap Point |
|---|---|---|---|---|
| PhotoReviewSheet | `components/photos/PhotoReviewSheet.tsx` | No | Dynamic | — |
| DefectReportDetailModal | `components/maintenance/DefectReportDetailModal.tsx` | No | Dynamic | — |
| ScanConfirmation | `components/scanner/ScanConfirmation.tsx` (snap set in `app/(tabs)/scan.tsx`) | No | Dynamic | — |
| DefectReportSheet | `components/scanner/DefectReportSheet.tsx` | Yes (`AppTextInput`) | Fixed | `70%` |
| MaintenanceDetailModal | `components/maintenance/MaintenanceDetailModal.tsx` | Yes (edit/notes mode) | Fixed | `85%` (view), `92%` (editing) |
| CreateMaintenanceModal | `components/maintenance/CreateMaintenanceModal.tsx` | Yes (multiple fields) | Fixed | `92%` |
| CreateAssetModal | `components/assets/CreateAssetModal.tsx` | Yes (multiple fields) | Fixed | `92%` |

All file paths relative to `apps/mobile/src/`.

**Out of scope (no button visibility issue, admin/settings only):** DepotFormSheet, EditProfileModal, NotificationsModal, SecurityModal, AuditLogFilterSheet.

## Architecture

### SheetModal adapter changes

When a modal omits the `snapPoint` prop, SheetModal defaults to dynamic sizing (the `compact` code path already exists). No adapter code changes needed — the existing `compact` / `enableDynamicSizing` mode works. The existing `MAX_DYNAMIC_HEIGHT` (100% screen) is kept as-is since no other compact consumers need to change.

### Per-modal pattern (dynamic sizing — no text inputs)

```tsx
<SheetModal visible={visible} onClose={onClose} /* no snapPoint — triggers dynamic sizing */>
  <View style={sheetLayout.containerCompact}>
    <SheetHeader ... />
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: bottomPadding, gap: spacing.md }}>
      {/* content */}
      {/* buttons — inline at bottom */}
    </View>
  </View>
</SheetModal>
```

### Per-modal pattern (fixed snap — has text inputs)

```tsx
<SheetModal visible={visible} onClose={onClose} snapPoint="92%" keyboardAware>
  <View style={sheetLayout.containerCompact}>
    <SheetHeader ... />
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: bottomPadding, gap: spacing.md }}>
      {/* form fields */}
      {/* buttons — inline at bottom */}
    </View>
  </View>
</SheetModal>
```

### Key points for both patterns

- `containerCompact` (no `flex:1`) — content determines height, no overflow clipping
- No `BottomSheetScrollView` — plain `View` only
- No `SheetFooter` — buttons are the last child of the content `View`
- Bottom padding must include safe area inset (use `useSheetBottomPadding()` — previously handled by SheetFooter)

### Changes per modal

**PhotoReviewSheet:** Remove `snapPoint="82%"`. Switch `sheetLayout.container` to `containerCompact`. Remove snap point prop. Already has inline buttons. Add `useSheetBottomPadding()` for safe area.

**DefectReportDetailModal:** Remove `snapPoint={['75%', '92%']}`. Switch `sheetLayout.container` to `containerCompact`. Remove snap point prop. Already has inline buttons. Add `useSheetBottomPadding()`.

**ScanConfirmation:** Snap point is set in `app/(tabs)/scan.tsx` (currently `72%`), not in ScanConfirmation.tsx itself. Remove snap point from scan.tsx. Remove `BottomSheetScrollView` from ScanConfirmation, replace with plain `View`. Move `SheetFooter` confirm button inline into content. Note: `minTabHeight` tracking logic should be verified — it was designed for dynamic sizing and should still work.

**DefectReportSheet:** Change `snapPoint` from `"62%"` to `"70%"`. Switch `sheetLayout.containerTall` to `containerCompact`. Already has inline buttons. Add `useSheetBottomPadding()`.

**MaintenanceDetailModal:** Current snap: `editingNotes || isEditing ? '80%' : ['60%', '85%']`. Change to `isEditing ? '92%' : '85%'`. Remove `BottomSheetScrollView` + `SheetFooter`. Move status action buttons (from `renderStatusActions()`) inline at bottom of content View. Switch to `containerCompact`. Add `useSheetBottomPadding()`.

**CreateMaintenanceModal:** Current snap: `calendarExpanded ? '90%' : '73%'`. Change to fixed `'92%'`. Remove `BottomSheetScrollView` + `SheetFooter`. Move "Create Task" button inline. Switch to `containerCompact`. Add `useSheetBottomPadding()`.

**CreateAssetModal:** Currently uses default snap (90%). Set explicit `snapPoint="92%"`. Remove `BottomSheetScrollView` + `SheetFooter`. Move "Create Asset" button inline. Switch to `containerCompact`. Add `useSheetBottomPadding()`.

## What stays the same

- `SheetHeader` component
- `Button` component
- `SheetModal.tsx` adapter (no code changes needed)
- Animations (stagger entrance, scatter exit, tab fade)
- Props: `noBackdrop`, `onExitComplete`, `preventDismissWhileBusy`, `keyboardAware`
- `sheetLayout.containerCompact` already exists in `sheetLayout.ts`

## Risks

**PhotoReviewSheet image height:** Photo container is `Dimensions.get('window').height * 0.45` (absolute, not flex). On iPhone SE (667pt): ~300pt image + ~140pt chrome = ~440pt total (66% of screen) — fits comfortably. Dynamic sizing will measure this correctly since it's a fixed dimension, not flex.

**CreateAssetModal form length:** Tallest form in the app (8+ fields). At `92%` snap on iPhone SE that's ~614pt. Header (~50pt) + padding (~40pt) + fields (~480pt) + button (~50pt) = ~620pt — tight. If content overflows, compact spacing on the form fields can reduce height.

**ScanConfirmation Open Items tab:** With many open defects/tasks, content could exceed screen. The existing `minTabHeight` tracking prevents collapse on tab switch. Verify this still works without scroll.

## Testing

- Verify each modal: buttons visible on initial open, on all content variants
- Verify DefectReportDetailModal full vs compact variant
- Verify keyboard interaction: DefectReportSheet, CreateMaintenanceModal, CreateAssetModal, MaintenanceDetailModal (edit mode)
- Verify MaintenanceDetailModal transitions between view/edit mode
- Verify CreateMaintenanceModal calendar expansion
- Verify animations (stagger entrance, scatter exit) work with containerCompact
- Verify safe area bottom padding on devices with home indicator
- Test on smallest supported device (iPhone SE / 375x667)
