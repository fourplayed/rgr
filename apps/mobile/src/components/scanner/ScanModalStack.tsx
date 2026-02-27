import React from 'react';
import type { Asset, Depot, AssetScan, CombinationGroup } from '@rgr/shared';
import type { LocationData } from '../../hooks/useLocation';
import { ScanConfirmSheet } from './ScanConfirmSheet';
import { MaintenanceCheckbox } from './MaintenanceCheckbox';
import { DefectReportSheet } from './DefectReportSheet';
import { ScanSuccessSheet } from './ScanSuccessSheet';
import { CombinationLinkSheet } from './CombinationLinkSheet';
import { CombinationPhotoSheet } from './CombinationPhotoSheet';
import { EndCountReviewSheet } from './EndCountReviewSheet';
import { PhotoPromptSheet, CameraCapture } from '../photos';
import { AlertSheet, ErrorBoundary } from '../common';
import type { AlertSheetState } from '../../hooks/scan/useScanFlow';

interface ScanModalStackProps {
  // Scan confirm
  showConfirmSheet: boolean;
  scannedAsset: Asset | null;
  effectiveLocation: LocationData | null;
  matchedDepot: { depot: Depot; distanceKm: number } | null;
  isCreatingScan: boolean;
  markForMaintenance: boolean;
  canMarkMaintenance: boolean;
  onSetMarkForMaintenance: (v: boolean) => void;
  onConfirmScan: () => void;
  onCancelScan: () => void;
  onConfirmSheetDismiss: () => void;

  // Defect report
  showDefectReport: boolean;
  isSubmittingDefect: boolean;
  completedAsset: Asset | null;
  onDefectReportSubmit: (notes: string, wantsPhoto: boolean) => void;
  onDefectReportCancel: () => void;
  onDefectReportDismiss: () => void;

  // Photo prompt
  showPhotoPrompt: boolean;
  onPhotoPromptAddPhoto: () => void;
  onPhotoPromptSkip: () => void;
  onPhotoPromptDismiss: () => void;

  // Camera
  showCamera: boolean;
  lastScanEventId: string | null;
  onCameraClose: () => void;
  onPhotoUploaded: () => void;
  onCameraDismiss: () => void;

  // Success sheet
  showSuccessSheet: boolean;
  successItems: Array<{ label: string; value?: string }>;
  onSuccessDismiss: () => void;

  // Alert
  alertSheet: AlertSheetState;
  onAlertDismiss: () => void;

  // Combination link
  showLinkSheet: boolean;
  previousScanForLink: AssetScan | null;
  currentAssetNumber: string;
  existingComboSize: number | undefined;
  onLinkToPrevious: () => void;
  onKeepSeparate: () => void;
  onLinkSheetDismiss: () => void;

  // Combination photo
  showCombinationPhoto: boolean;
  activeCombinationId: string | null;
  combinationAssetNumbers: string[];
  onCombinationPhotoCapture: (photoUri: string) => void;
  onCombinationNotesChange: (notes: string) => void;
  onCombinationPhotoComplete: () => void;
  onCombinationPhotoSkip: () => void;

  // End count review
  showEndCountReview: boolean;
  endCountDepotName: string;
  endCountScans: AssetScan[];
  endCountCombinations: Record<string, CombinationGroup>;
  isSubmittingCount: boolean;
  onEditCombination: (combinationId: string) => void;
  onSubmitCount: () => void;
  onCancelEndCount: () => void;
}

export function ScanModalStack(props: ScanModalStackProps) {
  return (
    <>
      <ScanConfirmSheet
        visible={props.showConfirmSheet}
        asset={props.scannedAsset}
        location={props.effectiveLocation}
        matchedDepot={props.matchedDepot}
        isSubmitting={props.isCreatingScan}
        onConfirm={props.onConfirmScan}
        onCancel={props.onCancelScan}
        onDismiss={props.onConfirmSheetDismiss}
      >
        {props.canMarkMaintenance && (
          <MaintenanceCheckbox
            checked={props.markForMaintenance}
            onChange={props.onSetMarkForMaintenance}
            disabled={props.isCreatingScan}
          />
        )}
      </ScanConfirmSheet>

      <DefectReportSheet
        visible={props.showDefectReport}
        assetNumber={props.completedAsset?.assetNumber ?? ''}
        isSubmitting={props.isSubmittingDefect}
        onSubmit={props.onDefectReportSubmit}
        onCancel={props.onDefectReportCancel}
        onDismiss={props.onDefectReportDismiss}
      />

      <PhotoPromptSheet
        visible={props.showPhotoPrompt}
        assetNumber={props.completedAsset?.assetNumber ?? ''}
        onAddPhoto={props.onPhotoPromptAddPhoto}
        onSkip={props.onPhotoPromptSkip}
        onDismiss={props.onPhotoPromptDismiss}
      />

      {props.completedAsset && (
        <ErrorBoundary>
          <CameraCapture
            visible={props.showCamera}
            assetId={props.completedAsset.id}
            scanEventId={props.lastScanEventId}
            locationDescription={props.matchedDepot?.depot.name ?? null}
            latitude={props.effectiveLocation?.latitude ?? null}
            longitude={props.effectiveLocation?.longitude ?? null}
            onClose={props.onCameraClose}
            onPhotoUploaded={props.onPhotoUploaded}
            onDismiss={props.onCameraDismiss}
          />
        </ErrorBoundary>
      )}

      <ScanSuccessSheet
        visible={props.showSuccessSheet}
        items={props.successItems}
        onDismiss={props.onSuccessDismiss}
      />

      {/* Alert Sheet for errors/warnings */}
      <AlertSheet
        visible={props.alertSheet.visible}
        type={props.alertSheet.type}
        title={props.alertSheet.title}
        message={props.alertSheet.message}
        onDismiss={props.onAlertDismiss}
      />

      {/* Combination Link Sheet */}
      <CombinationLinkSheet
        visible={props.showLinkSheet}
        previousScan={props.previousScanForLink}
        currentAssetNumber={props.currentAssetNumber}
        {...(props.existingComboSize != null ? { existingComboSize: props.existingComboSize } : {})}
        onLinkToPrevious={props.onLinkToPrevious}
        onKeepSeparate={props.onKeepSeparate}
        onDismiss={props.onLinkSheetDismiss}
      />

      {/* Combination Photo Sheet */}
      {props.activeCombinationId && props.combinationAssetNumbers.length > 0 && (
        <CombinationPhotoSheet
          visible={props.showCombinationPhoto}
          assetNumbers={props.combinationAssetNumbers}
          combinationId={props.activeCombinationId}
          onCapture={props.onCombinationPhotoCapture}
          onNotesChange={props.onCombinationNotesChange}
          onComplete={props.onCombinationPhotoComplete}
          onSkip={props.onCombinationPhotoSkip}
        />
      )}

      {/* End Count Review Sheet */}
      <EndCountReviewSheet
        visible={props.showEndCountReview}
        depotName={props.endCountDepotName}
        scans={props.endCountScans}
        combinations={props.endCountCombinations}
        isSubmitting={props.isSubmittingCount}
        onEditCombination={props.onEditCombination}
        onSubmit={props.onSubmitCount}
        onCancel={props.onCancelEndCount}
      />
    </>
  );
}
