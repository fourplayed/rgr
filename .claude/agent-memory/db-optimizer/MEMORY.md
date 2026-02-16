# RGR Fleet Manager - Database Schema Reference

## Database Details
- **Engine**: PostgreSQL 15+ (Supabase hosted)
- **Project Ref**: eryhwfkqbbuftepjvgwq
- **Region**: South Asia (Mumbai) -- IPv6 only for direct DB connection
- **Schema applied**: 2026-02-15 via `supabase db push`
- **Migration file**: `rgr/supabase/migrations/20260215000000_initial_schema.sql`

## Connection Notes
- Direct DB connection (db.xxx.supabase.co) is IPv6-only; use `supabase db push --linked` instead
- Supabase CLI is linked and authenticated; use `supabase inspect db ...` for diagnostics
- REST API (eryhwfkqbbuftepjvgwq.supabase.co) works fine over HTTPS

## Tables (9 total)
See [schema-details.md](schema-details.md) for full column definitions.

1. **depots** - Depot/yard reference (~8 rows seeded for WA)
2. **profiles** - User profiles linked to auth.users (FK: id -> auth.users.id)
3. **assets** - Fleet assets (trailers TL###, dollies DL###), denormalized last location
4. **scan_events** - QR scan events with geolocation (append-only, high volume)
5. **photos** - Photo uploads for freight analysis
6. **freight_analysis** - AI classification results (1:1 with photos)
7. **hazard_alerts** - Detected hazards with review workflow
8. **maintenance_records** - Asset maintenance tracking
9. **audit_log** - System-wide audit trail (append-only)

## Key Design Decisions
- `gen_random_uuid()` for UUIDs (built-in PG 13+, not uuid-ossp extension)
- Denormalized `last_latitude/longitude` on assets table to avoid JOIN for map queries
- Trigger `on_scan_event_update_asset_location` keeps denormalized location in sync
- Trigger `on_auth_user_created` auto-creates profile row on signup
- Soft deletes via `deleted_at` on assets; partial indexes exclude deleted rows
- All timestamps use TIMESTAMPTZ
- Custom enum types for roles, statuses, etc.

## Indexing Strategy (32 custom indexes)
- Partial indexes on `deleted_at IS NULL` for all asset queries
- Composite indexes aligned with exact query patterns from useFleetData.ts
- `idx_hazard_alerts_pending` uses WHERE status='active' for review queue
- Descending indexes on created_at for time-ordered feeds

## RLS
- All 9 tables have RLS enabled
- Helper functions: `auth_user_role()`, `is_manager_or_above()`
- Drivers/mechanics: read-all, insert scan_events and photos
- Managers+: full CRUD on assets, maintenance, hazard review
- Superusers: additional deletion and role-change privileges
- Service role: bypass for triggers and edge functions

## ORM / Query Patterns
- Supabase JS client via `@rgr/shared` package
- Column naming: snake_case in DB, camelCase in TypeScript (mapRowToProfile)
- useFleetData.ts queries: statistics, recentScans, outstandingAssets, assetLocations
- useHazardReview.ts: hazard_alerts with freight_analysis, photos, assets JOINs
- usePhotoAnalysis.ts: photos insert, edge function invoke
- Real-time subscriptions on: scan_events, assets, hazard_alerts

## Monorepo Structure
- `rgr/packages/shared/` - types, services, Supabase client
- `rgr/apps/web/` - React web app with Vite
- `rgr/apps/mobile/` - placeholder (empty)
- `rgr/supabase/` - migrations, edge functions (generate-qr, maintenance-reminder, scan-webhook)
