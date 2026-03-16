# Dynamic Modal Layout Refactor

**Date:** 2026-03-16
**Status:** Approved

## Problem

Modals flowing from the scan tab, asset, maintenance, and defect screens have buttons that are invisible — clipped by `overflow: hidden` on `flex:1` containers when content exceeds the snap point boundary. Previous fix attempts (raising snap points) did not resolve the issue.

## Solution

Switch all 7 in-scope modals to **gorhom `enableDynamicSizing`** — the sheet measures its content and sizes itself to fit. No scroll views, no sticky footers, buttons always inline in the content flow.

## Scope

| Modal | File | Current Layout | Change |
|---|---|---|---|
| PhotoReviewSheet | `components/photos/PhotoReviewSheet.tsx` | snap 82%, flex View | Dynamic sizing, `containerCompact` |
| DefectReportSheet | `components/scanner/DefectReportSheet.tsx` | snap 62%, flex View | Dynamic sizing, `containerCompact` |
| DefectReportDetailModal | `components/maintenance/DefectReportDetailModal.tsx` | snap 75%/92%, flex View | Dynamic sizing, `containerCompact` |
| ScanConfirmation | `components/scanner/ScanConfirmation.tsx` | dynamic, BSScrollView + SheetFooter | Remove scroll + footer, inline buttons |
| MaintenanceDetailModal | `components/maintenance/MaintenanceDetailModal.tsx` | snap 60%/85%, BSScrollView + SheetFooter | Dynamic sizing, remove scroll + footer, inline buttons |
| CreateMaintenanceModal | `components/maintenance/CreateMaintenanceModal.tsx` | snap 73%/90%, BSScrollView + SheetFooter | Dynamic sizing, remove scroll + footer, inline button |
| CreateAssetModal | `components/assets/CreateAssetModal.tsx` | snap 90%, BSScrollView + SheetFooter | Dynamic sizing, remove scroll + footer, inline button |

All file paths relative to `apps/mobile/src/`.

## Architecture

### SheetModal adapter

`SheetModal.tsx` gets a new mode: when no `snapPoint` prop is provided (or `dynamicSizing={true}`):
- Set `enableDynamicSizing={true}` on gorhom `BottomSheetModal`
- Set `maxDynamicContentSize` to `Dimensions.get('window').height * 0.92`
- Omit `snapPoints` array entirely (gorhom requires either snap points OR dynamic sizing, not both)

Existing modals that pass `snapPoint` continue to work unchanged.

### Per-modal pattern

Each modal applies this structure:

```tsx
<SheetModal visible={visible} onClose={onClose} /* no snapPoint */>
  <View style={sheetLayout.containerCompact}>
    <SheetHeader ... />
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
      {/* content */}
      {/* buttons — inline at bottom */}
    </View>
  </View>
</SheetModal>
```

Key points:
- `containerCompact` (no `flex:1`) — lets gorhom measure intrinsic height
- No `BottomSheetScrollView` — plain `View` only
- No `SheetFooter` — buttons are the last child of the content `View`
- `maxDynamicContentSize` at 92% screen height — safety cap

### Removals per modal

**PhotoReviewSheet:** Remove `snapPoint="82%"`, switch `sheetLayout.container` to `containerCompact`.

**DefectReportSheet:** Remove `snapPoint="62%"`, switch `sheetLayout.containerTall` to `containerCompact`.

**DefectReportDetailModal:** Remove `snapPoint={['75%', '92%']}`, switch `sheetLayout.container` to `containerCompact`.

**ScanConfirmation:** Already uses dynamic sizing. Remove `BottomSheetScrollView`, replace with plain `View`. Move `SheetFooter` buttons inline into content. Switch container if needed.

**MaintenanceDetailModal:** Remove `snapPoint={['60%', '85%']}`. Remove `BottomSheetScrollView` + `SheetFooter`. Move status action buttons inline. Switch to `containerCompact`.

**CreateMaintenanceModal:** Remove `snapPoint` (73%/90%). Remove `BottomSheetScrollView` + `SheetFooter`. Move "Create Task" button inline. Switch to `containerCompact`.

**CreateAssetModal:** Remove `snapPoint` (90%). Remove `BottomSheetScrollView` + `SheetFooter`. Move "Create Asset" button inline. Switch to `containerCompact`.

## What stays the same

- `SheetHeader` component
- `Button` component
- Animations (stagger entrance, scatter exit, tab fade)
- Props: `noBackdrop`, `onExitComplete`, `preventDismissWhileBusy`, `keyboardAware`
- `sheetLayout.containerCompact` already exists in `sheetLayout.ts`

## Risk

**CreateAssetModal** is the tallest form. If content exceeds 92% screen height it will be clipped by `maxDynamicContentSize`. Mitigation: 92% provides ~736px on a standard iPhone — sufficient for the form fields. If needed, compact spacing can reduce height.

## Testing

- Verify each modal: buttons visible on initial open
- Verify content with conditional sections (DefectReportDetailModal full vs compact variant)
- Verify keyboard interaction (DefectReportSheet, CreateMaintenanceModal, CreateAssetModal)
- Verify CreateMaintenanceModal calendar expansion resizes sheet
- Verify animations (stagger entrance, scatter exit) still work with containerCompact
- Test on smallest supported device (iPhone SE / 375x667)
