# Integration Specialist Memory

## Project: RGR (Trailer Management System)

### Architecture Overview
- Expo React Native mobile app + Supabase (auth, DB, storage, edge functions)
- React Query for server state, Zustand for client state
- Shared service layer in `packages/shared/src/services/supabase/`
- All service functions return `ServiceResult<T>` pattern: `{ success, data, error }`
- React Query hooks convert `!result.success` to thrown errors

### Authentication Flow (Mobile)
- Primary: `signInWithEmailSecure` -> Edge Function `secure-auth` -> server-side rate limiting
- Fallback: Direct `signInWithEmail` on 404 (not deployed) or network error (SECURITY ISSUE)
- Auto-login: Tokens in SecureStore, checked on app launch with expiry buffer (1min)
- Session refresh: `autoRefreshToken: true` + manual `getSession()` on foreground resume
- Auth state listener: catches `SIGNED_OUT` and failed `TOKEN_REFRESHED`
- Logout: clears state BEFORE signOut to prevent listener race

### Authentication Flow (Web)
- Deferred navigation pattern with `pendingNavRef`
- Debug toolbar with workflow visualization (dev-only)
- 6-step workflow: connect -> auth -> session -> profile -> permissions -> sync

### React Query Config (apps/mobile/app/_layout.tsx)
- staleTime=5min, gcTime=10min, retry=1 (skip auth errors), refetchOnWindowFocus=false
- refetchOnReconnect=false (known gap)
- Auth errors detected via string matching in `authErrors.ts`
- Cache cleared on logout via `queryClient.clear()`

### Key Integration Patterns
- `refetchType: 'none'` in mutation onSuccess to mark stale without refetching
- Cursor-based pagination with composite cursors (createdAt, id) for tie-breaking
- PostgREST filter metachar escaping: `search.replace(/[%_\\,().]/g, ...)`
- Status transitions validated client-side before update (defects, maintenance)
- Optimistic concurrency: `.eq('status', currentStatus)` prevents stale writes

### Edge Functions
- `secure-auth`: In-memory rate limiting (email: 5/15min, IP: 20/15min) - RESETS ON COLD START
- `admin-create-user`: Superuser-only, role verified from profiles table, rollback on failure
- Both use deprecated `serve()` from deno std; should migrate to `Deno.serve()`
- CORS: `Access-Control-Allow-Origin: *` (should restrict)

### Known Issues (Audit 2026-03-06)
See `integration-audit-findings.md` for full details.
- No timeouts on any fetch call (Edge Functions, Supabase client)
- No offline queue or optimistic updates
- Photo upload has no retry mechanism
- Network error fallback bypasses server-side rate limiting
- `refetchOnReconnect: false` prevents auto-sync after offline

### File Locations
- Supabase client: `packages/shared/src/services/supabase/client.ts`
- Auth service: `packages/shared/src/services/supabase/auth.ts`
- Assets service: `packages/shared/src/services/supabase/assets.ts`
- Photos service: `packages/shared/src/services/supabase/photos.ts`
- Auth store: `apps/mobile/src/store/authStore.ts`
- Location store: `apps/mobile/src/store/locationStore.ts`
- Root layout (RQ config): `apps/mobile/app/_layout.tsx`
- Scan flow: `apps/mobile/src/hooks/scan/useScanActionFlow.ts`
- Rate limiter: `packages/shared/src/utils/authRateLimiter.ts`
- Web login: `apps/web/src/pages/Login.tsx` + `login/LoginPresenter.tsx`
- Web debug toolbar: `apps/web/src/pages/login/components/DebugToolbar.tsx`
