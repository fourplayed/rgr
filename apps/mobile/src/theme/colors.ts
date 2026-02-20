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

  // User role colors
  userRole: {
    driver: '#00A8FF',     // Light blue
    mechanic: '#F59E0B',   // Orange
    manager: '#22C55E',    // Green
    yardie: '#EAB308',     // Yellow
    superuser: '#A855F7',  // Purple
  },

  // UI elements
  background: '#FFFFFF',
  backgroundDark: '#0000CC',
  surface: '#F8FAFC',
  surfaceDark: '#1E3A8A',
  border: '#E2E8F0',
  borderDark: '#334155',

  // Text
  text: '#1E293B',
  textSecondary: '#64748B',
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

  // Background gradients (chrome gradient)
  gradientColors: ['#C0C0C0', '#E8E8E8', '#F5F5F5'] as const,
  gradientLocations: [0, 0.5, 1] as const,
  gradientStart: { x: 0, y: 0 } as const,
  gradientEnd: { x: 0, y: 1 } as const,
  // Legacy arrays for backwards compatibility
  gradientLight: ['#C0C0C0', '#E8E8E8', '#F5F5F5'] as const,
  gradientDark: ['#C0C0C0', '#E8E8E8', '#F5F5F5'] as const,

  // Opacity variants
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorKey = keyof typeof colors;
