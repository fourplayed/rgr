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
- Fail-closed: returns error on 404/network failure (no fallback to direct auth)
- Auto-login: Tokens in SecureStore, checked on app launch with expiry buffer (1min)
- Session refresh: `autoRefreshToken: true` + manual `getSession()` on foreground resume
- Auth state listener: catches `SIGNED_OUT` and failed `TOKEN_REFRESHED`
- Logout: clears state BEFORE signOut to prevent listener race

### Authentication Flow (Web)
- Uses `signInWithEmailSecure` by default (env var `VITE_USE_SECURE_AUTH` for rollback)
- Deferred navigation pattern with `pendingNavRef`
- Debug toolbar with workflow visualization (dev-only, env-guarded)
- 6-step workflow: connect -> auth -> session -> profile -> permissions -> sync

### React Query Config (apps/mobile/app/_layout.tsx)
- staleTime=5min, gcTime=10min, retry=3 (skip auth errors), refetchOnWindowFocus=false
- refetchOnReconnect='always' — all queries refetch on reconnect
- Mutation retry: 2 retries, 10s cap, auth errors excluded
- Auth errors detected via string matching in `authErrors.ts`
- Cache cleared on logout via `queryClient.clear()`
- onlineManager wired to NetInfo (pauses mutations when offline, replays offline scan queue on reconnect)

### Key Integration Patterns
- `refetchType: 'none'` in mutation onSuccess to mark stale without refetching
- Cursor-based pagination with composite cursors (createdAt, id) for tie-breaking
- PostgREST filter metachar escaping: `search.replace(/[%_\\,().]/g, ...)`
- Status transitions validated client-side before update (defects, maintenance)
- Optimistic concurrency: `.eq('status', currentStatus)` prevents stale writes

### Edge Functions
- `secure-auth`: DB-backed rate limiting (email: 5/15min, IP: 20/15min) via `rate_limits` table
- `admin-create-user`: Superuser-only, role verified from profiles table, rollback on failure
- Both use `Deno.serve()` (migrated from deprecated `serve()`)
- CORS: Uses `ALLOWED_ORIGIN` env var (restricted)

### Offline & Realtime (Added March 2026)
- Offline scan queue: `apps/mobile/src/utils/offlineScanQueue.ts` — AsyncStorage-backed, auto-replays on reconnect
- Mobile Realtime: `apps/mobile/src/hooks/useRealtimeInvalidation.ts` — subscribes to scan_events INSERT + assets UPDATE
- Error reporting: `apps/mobile/src/utils/errorReporting.ts` — abstraction ready for Sentry integration

### Audit Issues — ALL RESOLVED
See `.claude/agent-memory/review-fix-tracker.md` for full resolution details.
- [x] INT-1: Offline scan queue created (offlineScanQueue.ts)
- [x] INT-2: Error reporting abstraction created (errorReporting.ts)
- [x] INT-3: Mutation retry added to React Query config
- [x] INT-4: refetchOnReconnect changed to 'always'
- [x] INT-5: Mobile Realtime hook created (useRealtimeInvalidation.ts)
- [x] INT-6: Push notification UI — added "not yet connected" banner
- [x] INT-7: Depot assignment — shows warning alert on failure
- [x] INT-8: Edge functions migrated to Deno.serve()
- [x] INT-9: CORS already restricted via ALLOWED_ORIGIN env var

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
- Offline queue: `apps/mobile/src/utils/offlineScanQueue.ts`
- Error reporting: `apps/mobile/src/utils/errorReporting.ts`
- Realtime hook: `apps/mobile/src/hooks/useRealtimeInvalidation.ts`
- Web login: `apps/web/src/pages/Login.tsx` + `login/LoginPresenter.tsx`
- Web debug toolbar: `apps/web/src/pages/login/components/DebugToolbar.tsx`
