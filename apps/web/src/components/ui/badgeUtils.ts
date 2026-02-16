type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case 'serviced':
    case 'completed':
    case 'available':
      return 'success';
    case 'in_maintenance':
    case 'pending':
    case 'in_progress':
      return 'warning';
    case 'inactive':
    case 'retired':
    case 'overdue':
      return 'danger';
    default:
      return 'default';
  }
}

/**
 * Get badge variant for asset status (matches shared AssetStatus type)
 */
export function getAssetStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'serviced':
      return 'success';
    case 'maintenance':
      return 'warning';
    case 'out_of_service':
      return 'danger';
    default:
      return 'default';
  }
}

/**
 * Get badge variant for scan types
 */
export function getScanTypeBadgeVariant(scanType: string): BadgeVariant {
  switch (scanType) {
    case 'location_update':
      return 'info';
    case 'maintenance_start':
      return 'warning';
    case 'maintenance_end':
      return 'success';
    case 'damage_report':
      return 'danger';
    default:
      return 'default';
  }
}
