# Debug Investigator Memory

## Expo Router Monorepo Issue (2026-02-23)

**Error**: `Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT`

**Root Cause**: In npm workspaces, `babel-preset-expo` hoists to monorepo root but `expo-router` stays in workspace's local node_modules. The `hasModule('expo-router')` check fails -> `expoRouterBabelPlugin` never loads -> env var never transformed.

**Solution**: Add `expo-router` to monorepo root's package.json dependencies.

**Key files**: `babel-preset-expo/build/index.js` (line 156), `babel-preset-expo/build/common.js`

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
