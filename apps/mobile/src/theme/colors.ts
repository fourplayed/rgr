/**
 * RGR Fleet Color Palette
 */
import type { MaintenancePriority } from '@rgr/shared';

export const colors = {
  // Primary brand colors
  navy: '#000030',
  electricBlue: '#00A8FF',
  neonViolet: '#9D00FF',
  violet: '#8B5CF6',
  chrome: '#E8E8E8',
  // Primary action color (buttons, links)
  primary: '#0000FF',
  primaryDark: '#0000CC',

  // Status colors (matching shared enums)
  status: {
    active: '#22C55E',
    maintenance: '#F59E0B',
    outOfService: '#EF4444',
    retired: '#6B7280',
    inspection: '#3B82F6',
  },

  // Maintenance status (keys match MaintenanceStatus enum values)
  maintenanceStatus: {
    scheduled: '#F59E0B',
    completed: '#22C55E',
    cancelled: '#6B7280',
  } satisfies Record<string, string>,

  // Maintenance priority
  maintenancePriority: {
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  } satisfies Record<MaintenancePriority, string>,

  // Hazard severity
  hazardSeverity: {
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  },

  // Count session status
  countSessionStatus: {
    in_progress: '#3B82F6',  // info blue
    completed: '#22C55E',    // success green
    cancelled: '#EF4444',    // error red
  },

  // User role colors
  userRole: {
    driver: '#00A8FF',     // Light blue
    mechanic: '#F59E0B',   // Orange
    manager: '#8B5CF6',    // Violet
    superuser: '#A855F7',  // Purple
  },

  // UI elements
  background: '#FFFFFF',
  backgroundDark: '#0000CC',
  surface: '#F8FAFC',
  surfaceDark: '#1E3A8A',
  surfaceSubtle: 'rgba(0, 0, 0, 0.05)',
  border: '#E2E8F0',
  borderDark: '#334155',

  // Text
  text: '#1E293B',
  textSecondary: '#475569',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  // Feature-specific semantic colors
  defectYellow: '#FACC15',
  categoryDolly: '#0E7490',

  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  warningText: '#B45309',
  warningSurface: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningGradient: ['#F59E0B', '#D97706'] as const,
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

  // Brand gradient (tab bar, header)
  brandGradient: ['#000099', '#0000CC', '#000099'] as const,
  brandGradientHeader: ['#0000DD', '#000099'] as const,
  brandTabBar: '#0000CC',
  brandTabActive: '#000099',

  // Opacity variants
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayCard: 'rgba(0, 0, 30, 0.5)',
} as const;

export type ColorKey = keyof typeof colors;
