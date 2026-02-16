/**
 * Dashboard page types and constants
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { LogOut, Settings, ShieldCheck } from 'lucide-react';
import { LayoutGrid, Boxes, Bolt, ActivityIcon, ChartColumn } from '@/components/icons';

// =============================================================================
// TYPES
// =============================================================================

export type DashboardSection =
  | 'dashboard'
  | 'assets'
  | 'maintenance'
  | 'load-analyzer'
  | 'reports'
  | 'settings'
  | 'admin';

export interface NavItem {
  icon: React.ComponentType<{ width?: number; height?: number; stroke?: string; strokeWidth?: number; isHovered?: boolean }>;
  label: string;
  path: string;
  section: DashboardSection;
}

export interface RightNavItem {
  icon: LucideIcon;
  label: string;
  action: string; // 'signout' | 'settings' | 'theme' | 'admin'
  path?: string;
  requiresSuperuser?: boolean;
}

// =============================================================================
// NAV CONFIGURATION
// =============================================================================

/** Left-side navigation items */
export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard', section: 'dashboard' },
  { icon: Boxes, label: 'Assets', path: '/assets', section: 'assets' },
  { icon: Bolt, label: 'Maintenance', path: '/maintenance', section: 'maintenance' },
  { icon: ActivityIcon, label: 'Load Analyzer', path: '/load-analyzer', section: 'load-analyzer' },
  { icon: ChartColumn, label: 'Reports', path: '/reports', section: 'reports' },
];

/** Right-side action items */
export const RIGHT_NAV_ITEMS: RightNavItem[] = [
  { icon: Settings, label: 'Settings', action: 'settings', path: '/settings' },
  { icon: ShieldCheck, label: 'Admin', action: 'admin', path: '/admin', requiresSuperuser: true },
  { icon: LogOut, label: 'Sign Out', action: 'signout' },
];

// =============================================================================
// DOMAIN TYPES (used by dashboard widgets/components)
// =============================================================================

export type TimeRange = 'today' | 'week' | 'month' | 'all';

export interface RecentScanEvent {
  id: string;
  assetNumber: string;
  assetCategory: 'trailer' | 'dolly';
  scannedAt: string;
  scannerName: string;
  locationDescription?: string;
}

export interface FleetStatistics {
  totalAssets: number;
  activeAssets: number;
  inMaintenance: number;
  outOfService: number;
  trailerCount: number;
  dollyCount: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DASHBOARD_CONSTANTS = {
  NAV_HEIGHT: 66,
  CONTENT_MAX_WIDTH: 1400,
  ARIA: {
    NAV_LABEL: 'Main navigation',
    CONTENT_LABEL: 'Dashboard content',
    SKIP_LINK_TEXT: 'Skip to main content',
  },
} as const;
