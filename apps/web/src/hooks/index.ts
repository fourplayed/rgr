/**
 * Custom React hooks for the RGR Fleet Manager web app
 */

export { useQRScanner } from './useQRScanner';
export type { QRScannerState, QRScannerConfig, UseQRScannerReturn } from './useQRScanner';

export { useGeolocation } from './useGeolocation';

export { useDeploymentStatus } from './useDeploymentStatus';
export {
  useFleetStatistics,
  useRecentScans,
  useOutstandingAssets,
  useAssetLocations,
  useFleetRealtime,
  useFleetDashboard,
  FLEET_QUERY_KEYS,
} from './useFleetData';
export type {
  FleetStatistics,
  RecentScan,
  OutstandingAsset,
  AssetLocation,
} from './useFleetData';
export type { UseDeploymentStatusReturn, UseDeploymentStatusOptions } from '../components/dashboard/types/deployment';

export { useHazardReview } from './useHazardReview';

export { useHazardAlertRealtime } from './useHazardAlertRealtime';
export type {
  UseHazardAlertRealtimeOptions,
  UseHazardAlertRealtimeResult,
  HazardRealtimeEvent,
  RealtimeHazardAlert,
} from './useHazardAlertRealtime';

export { useHazardReviewWithRealtime } from './useHazardReviewWithRealtime';
export type {
  UseHazardReviewWithRealtimeOptions,
  UseHazardReviewWithRealtimeResult,
} from './useHazardReviewWithRealtime';

export { usePhotoAnalysis } from './usePhotoAnalysis';
export type {
  AnalysisStatus,
  DetectedHazard,
  FreightInfo,
  AnalysisResult,
  PhotoAnalysisState,
  UsePhotoAnalysisResult,
} from './usePhotoAnalysis';
