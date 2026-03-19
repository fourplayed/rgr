/**
 * Zod schemas for validating RPC return shapes at runtime.
 *
 * Each Postgres RPC function returns `unknown` from the Supabase client.
 * Instead of casting with `as`, we validate with these schemas so that
 * a migration that changes an RPC return shape surfaces immediately
 * rather than silently producing undefined fields.
 */
import { z } from 'zod';

// ── Fleet Statistics (get_fleet_statistics) ──

export const FleetStatisticsResultSchema = z.object({
  total_assets: z.number(),
  serviced: z.number(),
  maintenance: z.number(),
  out_of_service: z.number(),
  trailer_count: z.number(),
  dolly_count: z.number(),
});

// ── Asset Scan Context (get_asset_scan_context) ──

export const AssetScanContextResultSchema = z.object({
  open_defect_count: z.number(),
  active_task_count: z.number(),
  open_defects: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string(),
      maintenance_record_id: z.string().nullable(),
      created_at: z.string(),
    })
  ),
  active_tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      priority: z.string(),
      created_at: z.string(),
    })
  ),
});

// ── Hard Delete Assets (hard_delete_assets) ──

export const HardDeleteAssetsResultSchema = z.array(
  z.object({
    deleted_id: z.string(),
  })
);

// ── Asset Counts By Status (get_asset_counts_by_status) ──

export const AssetCountsByStatusResultSchema = z.array(
  z.object({
    status: z.string(),
    count: z.union([z.string(), z.number()]),
  })
);

// ── Maintenance Stats (get_maintenance_stats) ──

export const MaintenanceStatsResultSchema = z.object({
  total: z.number(),
  scheduled: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  overdue: z.number(),
});

// ── Accept Defect Report (accept_defect_report) ──

export const AcceptDefectReportResultSchema = z.object({
  maintenance_id: z.string(),
  defect_report_id: z.string(),
});

// ── Defect Report Stats (get_defect_report_stats) ──

export const DefectReportStatsResultSchema = z.object({
  total: z.number(),
  reported: z.number(),
  task_created: z.number(),
  resolved: z.number(),
  dismissed: z.number(),
});

// ── Hazard Review Stats (get_hazard_review_stats) ──

export const HazardReviewStatsResultSchema = z.object({
  total_photos_analyzed: z.number(),
  pending_reviews: z.number(),
  ai_accuracy: z.number(),
  false_positive_rate: z.number(),
  severity_breakdown: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
});

// ── Bulk Cancel Maintenance Tasks (bulk_cancel_maintenance_tasks) ──

export const BulkCancelMaintenanceResultSchema = z.array(
  z.object({
    cancelled_id: z.string(),
  })
);
