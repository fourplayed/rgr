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
  chrome: '#F0F2F5',
  // Primary action color (buttons, links)
  primary: '#3B3BFF',
  primaryDark: '#2929CC',

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
    in_progress: '#3B82F6', // info blue
    completed: '#22C55E', // success green
    cancelled: '#EF4444', // error red
  },

  // User role colors
  userRole: {
    driver: '#00A8FF', // Light blue
    mechanic: '#F59E0B', // Orange
    manager: '#8B5CF6', // Violet
    superuser: '#A855F7', // Purple
  },

  // UI elements
  background: '#FFFFFF',
  backgroundDark: '#2929CC',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
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

  // Background gradients (chrome gradient — warmed to match #F0F2F5 chrome)
  gradientColors: ['#D0D4DA', '#E4E7EC', '#F0F2F5'] as const,
  gradientLocations: [0, 0.5, 1] as const,
  gradientStart: { x: 0, y: 0 } as const,
  gradientEnd: { x: 0, y: 1 } as const,
  // Legacy arrays for backwards compatibility
  gradientLight: ['#D0D4DA', '#E4E7EC', '#F0F2F5'] as const,
  gradientDark: ['#D0D4DA', '#E4E7EC', '#F0F2F5'] as const,

  // Brand gradient (tab bar, header — softened to match desaturated primary)
  brandGradient: ['#1A1A99', '#2929CC', '#1A1A99'] as const,
  brandGradientHeader: ['#3333DD', '#1A1A99'] as const,
  brandTabBar: '#2929CC',
  brandTabActive: '#1A1A99',

  // Opacity variants
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayCard: 'rgba(0, 0, 30, 0.5)',

  // Dev console (dev-only, neon yellow-green)
  devConsole: '#D4FF00',
} as const;

export type ColorKey = keyof typeof colors;
