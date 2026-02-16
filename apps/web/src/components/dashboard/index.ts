/**
 * Dashboard components barrel export
 */
export { StatCard, StatsGrid, StatsPills, type StatCardProps, type StatsGridProps, type IndicatorColor, type StatsPillsProps, type StatPill } from './stats';
export { ActivityItem, ActivityFeed, CollapsibleActivityBar, type ActivityItemProps, type ActivityFeedProps, type CollapsibleActivityBarProps } from './activity';
export { QuickAction, QuickActionsPanel, type QuickActionProps, type QuickActionsPanelProps, type ActionVariant } from './quick-actions';
export { DashboardHeader, type DashboardHeaderProps, type QuickActionButton } from './header';
export { ThemeToggle, type ThemeToggleProps } from './theme';
// FleetMap removed - use FleetMapWithData from './map' instead
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
