/**
 * Hazard Review Components - Barrel Export
 * Vision UI glassmorphism design system
 *
 * Components for reviewing AI-detected freight hazards:
 * - HazardReviewPanel: Main dashboard panel (composes all components)
 * - HazardReviewStats: Statistics overview card
 * - HazardReviewCard: Individual hazard card with review actions
 * - HazardReviewFilters: Filter controls for hazard list
 * - PhotoUploadZone: Drag-and-drop photo upload
 * - AnalysisResultCard: Display AI analysis results
 * - PhotoAnalysisSection: Combined upload and results section
 */

// Main Panel
export { HazardReviewPanel } from './HazardReviewPanel';
export type { HazardReviewPanelProps } from './HazardReviewPanel';

// Stats Component
export { HazardReviewStats } from './HazardReviewStats';
export type { HazardReviewStatsProps, HazardReviewStatsData } from './HazardReviewStats';

// Card Component
export { HazardReviewCard } from './HazardReviewCard';
export type {
  HazardReviewCardProps,
  HazardData,
  HazardSeverity,
  ReviewAction,
} from './HazardReviewCard';

// Filters Component
export { HazardReviewFilters } from './HazardReviewFilters';
export type {
  HazardReviewFiltersProps,
  HazardFilters,
  ReviewStatus,
  DateRange,
} from './HazardReviewFilters';

// Photo Upload Component
export { PhotoUploadZone } from './PhotoUploadZone';
export type { PhotoUploadZoneProps } from './PhotoUploadZone';

// Analysis Result Card
export { AnalysisResultCard } from './AnalysisResultCard';
export type { AnalysisResultCardProps } from './AnalysisResultCard';

// Photo Analysis Section (combines upload + results)
export { PhotoAnalysisSection } from './PhotoAnalysisSection';
export type { PhotoAnalysisSectionProps } from './PhotoAnalysisSection';

// Asset Selector (for associating photos with assets)
export { AssetSelector } from './AssetSelector';
export type { AssetSelectorProps } from './AssetSelector';

// Analysis Feedback Panel (for reviewing AI accuracy)
export { AnalysisFeedbackPanel } from './AnalysisFeedbackPanel';
export type {
  AnalysisFeedbackPanelProps,
  AnalysisFeedbackData,
  HazardFeedback,
} from './AnalysisFeedbackPanel';

// Image Lightbox (for viewing enlarged photos)
export { ImageLightbox } from './ImageLightbox';
export type { ImageLightboxProps } from './ImageLightbox';

// Analysis History Panel (for viewing past analyses)
export { AnalysisHistoryPanel } from './AnalysisHistoryPanel';
export type { AnalysisHistoryPanelProps } from './AnalysisHistoryPanel';
