# RGR Fleet Manager - Database Schema Reference

## Database Details
- **Engine**: PostgreSQL 15+ (Supabase hosted)
- **Project Ref**: eryhwfkqbbuftepjvgwq
- **Region**: South Asia (Mumbai) -- IPv6 only for direct DB connection
- **Migration count**: 54 SQL files in `rgr/supabase/migrations/`
- **Initial schema**: `20260215000000_initial_schema.sql`

## Connection Notes
- Direct DB connection is IPv6-only; use `supabase db push --linked` instead
- REST API (eryhwfkqbbuftepjvgwq.supabase.co) works fine over HTTPS

## Tables (13+ total, evolved from initial 9)
1. **depots** (~6 rows, WA depots with color column)
2. **profiles** (auth.users FK; depot is free-text, depot_id was dropped)
3. **assets** (soft deletes via deleted_at; denormalized last location from scans)
4. **scan_events** (append-only; removed from realtime pub in 20260302)
5. **photos** (GPS columns added later; photos-compressed bucket made private)
6. **freight_analysis** (1:1 with photos, enforced by unique index on photo_id)
7. **hazard_alerts** (review workflow)
8. **maintenance_records** (3-status enum: scheduled/completed/cancelled)
9. **audit_log** (append-only)
10. **defect_reports** (extracted from maintenance in 20260304; 4-status lifecycle)
11. **asset_count_sessions** + **asset_count_items** (depot inventory)
12. **asset_count_combination_metadata** + **combination_photos**
13. **rate_limits** (service_role only, edge function rate limiting)

## RPC Functions
- `get_fleet_statistics()` / `get_hazard_review_stats()` / `get_asset_counts_by_status()`
- `get_maintenance_stats()` / `get_defect_report_stats()`
- `get_asset_scan_context(UUID)` - mechanic context card
- `lookup_asset_by_qr(TEXT)` - multi-strategy QR lookup
- `accept_defect_report(UUID, JSONB)` - atomic defect->maintenance
- `submit_asset_count_items(UUID, JSONB)` - bulk insert with GUC skip
- `cancel_maintenance_task(UUID)` - SECURITY DEFINER (needs ownership check)

## Key Patterns
- GUC caching for auth_user_role() and is_user_active() per-transaction
- Trigger alphabetical ordering matters (trg_resolve before trg_revert)
- Enum evolution: create new type, swap column, drop old, rename
- Keyset/cursor pagination in mobile; offset fallback in web
- PostGIS not used; plain DOUBLE PRECISION lat/lng (correct for current patterns)

## Known Issues (2026-03-06 audit)
See [audit-findings.md](audit-findings.md) for details.
- cancel_maintenance_task: SECURITY DEFINER, insufficient ownership check
- defect_reports/maintenance INSERT: no reported_by = auth.uid() enforcement
- accept_defect_report: no JSONB status field validation
- Missing cursor pagination indexes on defect_reports and maintenance_records
- getTotalScanCount: full table COUNT(*) will degrade at scale
- Web subscribes to scan_events realtime but table removed from publication

## Monorepo Structure
- `rgr/packages/shared/` - types, services, Supabase client
- `rgr/apps/web/` - React web app with Vite
- `rgr/apps/mobile/` - React Native mobile app
- `rgr/supabase/` - migrations, edge functions, seed data
