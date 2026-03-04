import React from 'react';
import type { Asset, Depot, PhotoType } from '@rgr/shared';
import type { LocationData } from '../../hooks/useLocation';
import { ScanConfirmSheet } from './ScanConfirmSheet';
import { MaintenanceCheckbox } from './MaintenanceCheckbox';
import { DefectReportSheet } from './DefectReportSheet';
import { ScanSuccessSheet } from './ScanSuccessSheet';
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
  photoType: PhotoType;
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

}

export const ScanModalStack = React.memo(function ScanModalStack(props: ScanModalStackProps) {
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
        hasDefectToggled={props.markForMaintenance}
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
            photoType={props.photoType}
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

    </>
  );
});
