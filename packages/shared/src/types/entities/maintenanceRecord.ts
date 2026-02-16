import type { MaintenanceStatus, MaintenancePriority } from '../enums/MaintenanceEnums';

/**
 * MaintenanceRecord — camelCase application interface
 */
export interface MaintenanceRecord {
  id: string;
  assetId: string;
  reportedBy: string | null;
  assignedTo: string | null;
  completedBy: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  maintenanceType: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  partsUsed: Record<string, unknown>[] | null;
  hazardAlertId: string | null;
  scanEventId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * MaintenanceRecordRow — snake_case database row type
 */
export interface MaintenanceRecordRow {
  id: string;
  asset_id: string;
  reported_by: string | null;
  assigned_to: string | null;
  completed_by: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  maintenance_type: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  parts_used: Record<string, unknown>[] | null;
  hazard_alert_id: string | null;
  scan_event_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * MaintenanceRecord with joined profile names
 */
export interface MaintenanceRecordWithNames extends MaintenanceRecord {
  reporterName: string | null;
  assigneeName: string | null;
}

// ── Mapper ──

export function mapRowToMaintenanceRecord(
  row: MaintenanceRecordRow
): MaintenanceRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    reportedBy: row.reported_by,
    assignedTo: row.assigned_to,
    completedBy: row.completed_by,
    title: row.title,
    description: row.description,
    priority: row.priority as MaintenancePriority,
    status: row.status as MaintenanceStatus,
    maintenanceType: row.maintenance_type,
    scheduledDate: row.scheduled_date,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    dueDate: row.due_date,
    estimatedCost: row.estimated_cost,
    actualCost: row.actual_cost,
    partsUsed: row.parts_used,
    hazardAlertId: row.hazard_alert_id,
    scanEventId: row.scan_event_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
