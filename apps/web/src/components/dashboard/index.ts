/**
 * Dashboard components barrel export
 *
 * NOTE: FleetMap is NOT exported here to enable proper code splitting.
 * Import it directly: import FleetMap from '@/components/dashboard/map/FleetMap'
 * or use React.lazy for optimal bundle splitting.
 */
export { StatCard, StatsGrid, StatsPills, type StatCardProps, type StatsGridProps, type IndicatorColor, type StatsPillsProps, type StatPill } from './stats';
export { ActivityItem, ActivityFeed, CollapsibleActivityBar, type ActivityItemProps, type ActivityFeedProps, type CollapsibleActivityBarProps } from './activity';
export { QuickAction, QuickActionsPanel, type QuickActionProps, type QuickActionsPanelProps, type ActionVariant } from './quick-actions';
export { DashboardHeader, type DashboardHeaderProps, type QuickActionButton } from './header';
export { ThemeToggle, type ThemeToggleProps } from './theme';
// FleetMap excluded for code splitting - use lazy import
export type { FleetMapProps } from './map';
export { RightSidePanel, type RightSidePanelProps, type QuickActionConfig } from './panel';
export { VisionSidebar, type VisionSidebarProps, type NavItem } from './sidebar';
export { VisionTopNav, type VisionTopNavProps } from './navigation/VisionTopNav';
export { VisionCard, VisionStatCard, VisionWelcomeBanner, VisionActivityList, type VisionCardProps, type VisionStatCardProps, type GradientType, type VisionWelcomeBannerProps, type VisionActivityListProps } from './vision';
export { DeploymentStatus, type DeploymentStatusProps } from './DeploymentStatus';
export { SecurityStatus } from './SecurityStatus';
export { AnalyticsCharts, type AnalyticsChartsProps } from './AnalyticsCharts';
export type { WorkflowRun, DeploymentMetrics, WorkflowFilter, WorkflowStatus, WorkflowConclusion } from './types/deployment';
export {
  HazardReviewPanel,
  HazardReviewCard,
  HazardReviewStats,
  HazardReviewFilters,
  PhotoUploadZone,
  AnalysisResultCard,
  PhotoAnalysisSection,
  type HazardReviewPanelProps,
  type HazardReviewCardProps,
  type HazardReviewStatsProps,
  type HazardReviewStatsData,
  type HazardReviewFiltersProps,
  type HazardData,
  type HazardSeverity,
  type HazardFilters,
  type ReviewAction,
  type ReviewStatus,
  type DateRange,
  type PhotoUploadZoneProps,
  type AnalysisResultCardProps,
  type PhotoAnalysisSectionProps,
} from './hazards';
