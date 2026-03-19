/**
 * Zod response schemas for Supabase query results.
 *
 * Each schema matches the exact shape returned by a `.select()` string
 * in the service layer. Used with `validateQueryResult()` to provide
 * runtime validation instead of bare type assertions.
 *
 * Naming convention: <Entity><Context>ResponseSchema
 */

import { z } from 'zod';

// ── Shared join fragments ──

/** { full_name: string } — used for profile joins (reporter, assignee, etc.) */
const ProfileNameJoin = z.object({ full_name: z.string() }).nullable();

/** { asset_number: string } — used for asset joins in admin queries */
const AssetNumberJoin = z.object({ asset_number: z.string() }).nullable();

/** { asset_number: string, category: string } — used for asset joins with category */
const AssetNumberCategoryJoin = z
  .object({ asset_number: z.string(), category: z.string() })
  .nullable();

/** { name: string, code: string } — used for depot joins */
const DepotJoin = z.object({ name: z.string(), code: z.string() }).nullable();

// ── assets.ts — getAsset ──

/** Matches: *, depot:assigned_depot_id(name, code), driver:assigned_driver_id(full_name),
 *  scanner:last_scanned_by(full_name), photos(count) */
export const AssetWithJoinsResponseSchema = z
  .object({
    depot: DepotJoin,
    driver: ProfileNameJoin,
    scanner: ProfileNameJoin,
    photos: z.array(z.object({ count: z.number() })),
  })
  .passthrough();

// ── assets.ts — getAssetMaintenance ──

/** Matches: *, reporter:reported_by(full_name), assignee:assigned_to(full_name),
 *  completer:completed_by(full_name) — array result */
export const MaintenanceWithNamesResponseSchema = z.array(
  z
    .object({
      reporter: ProfileNameJoin,
      assignee: ProfileNameJoin,
      completer: ProfileNameJoin,
    })
    .passthrough()
);

// ── assets.ts — getRecentScans / getMyRecentScans ──

/** Matches: *, profiles(full_name), assets!inner(asset_number, category) — array result */
export const ScanEventWithJoinsResponseSchema = z.array(
  z
    .object({
      profiles: ProfileNameJoin,
      assets: AssetNumberCategoryJoin,
    })
    .passthrough()
);

// ── maintenance.ts — listMaintenance ──

/** Matches: id, asset_id, title, description, priority, status, maintenance_type,
 *  scheduled_date, due_date, created_at, reporter:reported_by(full_name),
 *  asset:asset_id(asset_number, category) — array result */
export const MaintenanceListResponseSchema = z.array(
  z
    .object({
      id: z.string(),
      asset_id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      priority: z.string(),
      status: z.string(),
      maintenance_type: z.string().nullable(),
      scheduled_date: z.string().nullable(),
      due_date: z.string().nullable(),
      created_at: z.string(),
      reporter: ProfileNameJoin,
      asset: AssetNumberCategoryJoin,
    })
    .strip()
);

// ── maintenance.ts — getMaintenanceById ──

/** Matches: *, reporter:reported_by(full_name), assignee:assigned_to(full_name),
 *  completer:completed_by(full_name) — single result */
export const MaintenanceDetailResponseSchema = z
  .object({
    reporter: ProfileNameJoin,
    assignee: ProfileNameJoin,
    completer: ProfileNameJoin,
  })
  .passthrough();

// ── defectReports.ts — listDefectReports ──

/** Matches: id, asset_id, title, description, status, maintenance_record_id, created_at,
 *  reporter:reported_by(full_name), asset:asset_id(asset_number, category) — array result */
export const DefectListResponseSchema = z.array(
  z
    .object({
      id: z.string(),
      asset_id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string(),
      maintenance_record_id: z.string().nullable(),
      created_at: z.string(),
      reporter: ProfileNameJoin,
      asset: AssetNumberCategoryJoin,
    })
    .strip()
);

// ── photos.ts — getPhotoById ──

/** Matches: *, freight_analysis!left(...all columns except raw_response) — single result */
export const PhotoWithAnalysisResponseSchema = z
  .object({
    freight_analysis: z
      .object({
        id: z.string(),
        photo_id: z.string(),
        asset_id: z.string().nullable(),
        analyzed_by_user: z.string().nullable(),
        primary_category: z.string().nullable(),
        secondary_categories: z.array(z.string()).nullable(),
        description: z.string().nullable(),
        confidence: z.number().nullable(),
        estimated_weight_kg: z.number().nullable(),
        load_distribution_score: z.number().nullable(),
        restraint_count: z.number().nullable(),
        hazard_count: z.number(),
        max_severity: z.string().nullable(),
        requires_acknowledgment: z.boolean(),
        blocked_from_departure: z.boolean(),
        model_version: z.string().nullable(),
        processing_duration_ms: z.number().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
      })
      .nullable(),
  })
  .passthrough();

// ── pushTokens.ts — upsertPushToken / getPushTokensForRole ──

/** Matches: * on push_tokens table — single row */
export const PushTokenRowResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  token: z.string(),
  device_id: z.string(),
  platform: z.enum(['ios', 'android']),
  created_at: z.string(),
  updated_at: z.string(),
});

// ── admin.ts — adminListMaintenance ──

/** Matches: id, title, status, due_date, created_at,
 *  reporter:reported_by(full_name), asset:asset_id(asset_number) — array result */
export const AdminMaintenanceListResponseSchema = z.array(
  z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      due_date: z.string().nullable(),
      created_at: z.string(),
      reporter: ProfileNameJoin,
      asset: AssetNumberJoin,
    })
    .strip()
);

// ── admin.ts — adminListDefectReports ──

/** Matches: id, title, status, created_at,
 *  reporter:reported_by(full_name), asset:asset_id(asset_number) — array result */
export const AdminDefectListResponseSchema = z.array(
  z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      created_at: z.string(),
      reporter: ProfileNameJoin,
      asset: AssetNumberJoin,
    })
    .strip()
);

// ── admin.ts — adminListPhotos ──

/** Matches: id, storage_path, thumbnail_path, photo_type, created_at,
 *  asset:asset_id(asset_number) — array result */
export const AdminPhotoListResponseSchema = z.array(
  z
    .object({
      id: z.string(),
      storage_path: z.string(),
      thumbnail_path: z.string().nullable(),
      photo_type: z.string(),
      created_at: z.string(),
      asset: AssetNumberJoin,
    })
    .strip()
);
