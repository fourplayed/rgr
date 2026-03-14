# Debug Investigator Memory

## ScrollView justifyContent Crash Pattern (2026-03-05)

**Pattern**: Dynamic `View`/`ScrollView` switching via `const Wrapper = condition ? ScrollView : View` can silently pass layout props (`justifyContent`, `alignItems`) into ScrollView's `style` prop. RN throws: "ScrollView child layout must be applied through contentContainerStyle prop."

**Key insight**: The crash happens on re-render (`updateClassComponent`), not mount -- because the condition that switches View->ScrollView changes after initial render.

**File**: `apps/mobile/src/components/scanner/ScanConfirmation.tsx` -- `ContentWrapper` pattern.

**Fix approach**: Create a separate style (without child layout props) for ScrollView's `style`, and merge layout props into `contentContainerStyle`.

---

## Expo Router Monorepo Issue (2026-02-23)

**Error**: `Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT`

**Root Cause**: In npm workspaces, `babel-preset-expo` hoists to monorepo root but `expo-router` stays in workspace's local node_modules. The `hasModule('expo-router')` check fails -> `expoRouterBabelPlugin` never loads -> env var never transformed.

**Solution**: Add `expo-router` to monorepo root's package.json dependencies.

**Key files**: `babel-preset-expo/build/index.js` (line 156), `babel-preset-expo/build/common.js`

---

## gorhom BottomSheetModal Stack Race Condition (2026-03-11)

**Pattern**: When multiple gorhom `BottomSheetModal` instances share a `BottomSheetModalProvider`, presenting modal B while modal A's dismiss animation is in progress can suppress A's `onDismiss` callback. This blocks any callback-driven state transitions (like `SHEET_EXIT_COMPLETE`) that depend on `onDismiss` firing.

**Root cause in scan flow**: The `showCard` derived value in `useScanFlow.ts` didn't account for `awaitingSheetExit`. After compound actions (`PHOTO_FLOW_COMPLETE`, `DEFECT_SUBMITTED`, `MAINTENANCE_CREATED`), the sub-sheet was animating out (`awaitingSheetExit=true`) while `showCard` evaluated to `true`, causing the confirmation card to `present()` into the gorhom stack during the exit animation.

**Symptom**: Blank screen (dark blur backdrop visible, no sheet on top) after photo capture. The `onDismiss` callback from the review sheet was suppressed, blocking `SHEET_EXIT_COMPLETE`, and leaving the state stuck in `active` phase with `awaitingSheetExit=true`.

**Fix**: Added `!state.awaitingSheetExit` to the `showCard` condition in `useScanFlow.ts`.

**Key lesson**: Any derived visibility flag for gorhom modals must check `awaitingSheetExit` to prevent stack conflicts during sheet-to-sheet transitions.

---

## Project Structure
- Monorepo at `rgr-new/rgr/` (NOT `rgr-new/apps/`) -- files are under `rgr/apps/web/src/`
- React + TypeScript + Vite + Vitest
- Uses react-router-dom v6 (BrowserRouter, Routes, Route)
- State management: Zustand (`authStore.ts`)
- Auth: Supabase
- Tests: Missing `@testing-library/react` dependency -- tests fail to load

## Login Page Architecture
- Container/Presenter pattern: `Login.tsx` (container) -> `LoginPresenter.tsx` (presenter)
- `useLoginLogic` hook supports dependency injection for `navigate` and `login`
- Route `/` redirects to `/login` -- so `navigate('/')` on login success causes a full remount of the login page
- `WorkflowLog.tsx` is LEGACY/UNUSED -- the workflow display was migrated to the DebugToolbar's "Workflow Log" tab

## Common Pitfalls (Login Page)
- `navigate('/')` in `useLoginLogic` causes remount -> state loss (fixed via deferred navigation in Login.tsx)
- `useCallback` dependency arrays must include all referenced callbacks to avoid stale closures
- React.StrictMode is active (`main.tsx`) -- causes double mount/unmount of effects in dev
- `handleFormSubmit` must declare `runWorkflow` AFTER `runWorkflow` to avoid TDZ (temporal dead zone) errors

## File Paths (Login Feature)
- `rgr/apps/web/src/pages/Login.tsx` - Container component
- `rgr/apps/web/src/pages/login/LoginPresenter.tsx` - Presenter
- `rgr/apps/web/src/pages/login/useLoginLogic.ts` - Business logic hook
- `rgr/apps/web/src/pages/login/components/LoginFormCard.tsx` - Login form
- `rgr/apps/web/src/pages/login/components/DebugToolbar.tsx` - Dev tools panel
- `rgr/apps/web/src/pages/login/components/WorkflowLog.tsx` - UNUSED legacy component
- `rgr/apps/web/src/stores/authStore.ts` - Zustand auth store
- `rgr/apps/web/src/App.tsx` - Router setup
