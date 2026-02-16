/**
 * RGR Fleet Color Palette
 */

export const colors = {
  // Primary brand colors
  navy: '#000030',
  electricBlue: '#00A8FF',
  chrome: '#E8E8E8',

  // Status colors (matching shared enums)
  status: {
    active: '#22C55E',
    maintenance: '#F59E0B',
    outOfService: '#EF4444',
    retired: '#6B7280',
    inspection: '#3B82F6',
  },

  // Maintenance status
  maintenanceStatus: {
    scheduled: '#3B82F6',
    inProgress: '#F59E0B',
    completed: '#22C55E',
    cancelled: '#6B7280',
  },

  // Maintenance priority
  maintenancePriority: {
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  },

  // Hazard severity
  hazardSeverity: {
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  },

  // UI elements
  background: '#FFFFFF',
  backgroundDark: '#000030',
  surface: '#F9FAFB',
  surfaceDark: '#0F172A',
  border: '#E5E7EB',
  borderDark: '#334155',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',

  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Scan-specific
  scanOverlay: 'rgba(0, 0, 48, 0.4)',
  scanCorner: '#00A8FF',
  scanSuccess: '#22C55E',

  // Opacity variants
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorKey = keyof typeof colors;
