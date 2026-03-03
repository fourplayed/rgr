import type { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function isDefectReport(maintenanceType: string | null): boolean {
  return maintenanceType === 'defect_report';
}

/** Returns icon name and color for a maintenance item, with defect-specific overrides */
export function getMaintenanceIconProps(
  maintenanceType: string | null,
  status: string,
  statusIconMap: Record<string, keyof typeof Ionicons.glyphMap>,
): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  if (maintenanceType === 'defect_report') {
    return { icon: 'warning', color: colors.warning };
  }
  const icon = statusIconMap[status] ?? 'ellipse-outline';
  const color = colors.maintenanceStatus[status as keyof typeof colors.maintenanceStatus] ?? colors.textSecondary;
  return { icon, color };
}
