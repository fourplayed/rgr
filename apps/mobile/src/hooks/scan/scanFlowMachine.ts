import type { Asset, Depot } from '@rgr/shared';
import type { CachedLocationData } from '../../store/locationStore';
import type { ScanStep } from '../../components/scanner/ScanProgressOverlay';

// ── Types ────────────────────────────────────────────────────────────────────

export type MatchedDepot = { depot: Depot; distanceKm: number };

export type ScanSheetId = 'defect' | 'review' | 'createTask';
export type ConfirmAction = 'photo' | 'defect' | 'maintenance' | null;

interface ScanTarget {
  scannedAsset: Asset;
  matchedDepot: MatchedDepot | null;
  effectiveLocation: CachedLocationData;
}

export interface CompletionSummary {
  assetNumber: string;
  depotName: string | null;
  photoCompleted: boolean;
  defectCompleted: boolean;
  maintenanceCompleted: boolean;
}

export type ScanFlowState =
  | { phase: 'idle' }
  | { phase: 'scanning'; scanStep: ScanStep }
  | ({
      phase: 'confirming';
      isCreatingScan: boolean;
      pendingUndo?: boolean; // Never explicitly set to undefined — satisfies exactOptionalPropertyTypes
    } & ScanTarget)
  | ({
      phase: 'active';
      lastScanEventId: string;
      photoCompleted: boolean;
      defectCompleted: boolean;
      maintenanceCompleted: boolean;
      cameraOpen: boolean;
      activeSheet: ScanSheetId | null;
      confirmedAction: ConfirmAction;
      awaitingSheetExit: boolean;
      wantsPhotoAfterExit: boolean;
      capturedPhotoUri: string | null;
    } & ScanTarget)
  | { phase: 'completing'; summary: CompletionSummary };

// ── Actions ──────────────────────────────────────────────────────────────────

export type ScanFlowAction =
  | { type: 'QR_DETECTED'; scanStep: ScanStep }
  | { type: 'UPDATE_SCAN_STEP'; scanStep: ScanStep }
  | {
      type: 'ASSET_FOUND';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
    }
  | { type: 'SCAN_CREATED'; lastScanEventId: string }
  | { type: 'CONFIRM_ACTION'; action: ConfirmAction }
  | { type: 'OPEN_CAMERA' }
  | { type: 'CAMERA_CAPTURED'; uri: string }
  | { type: 'CAMERA_CANCELLED' }
  | { type: 'CLOSE_SHEET' }
  | { type: 'SHEET_EXIT_COMPLETE' }
  | { type: 'SHEET_DISMISSED' }
  | { type: 'DEFECT_SUBMITTED'; wantsPhoto: boolean }
  | { type: 'PHOTO_FLOW_COMPLETE' }
  | { type: 'RETAKE_PHOTO' }
  | { type: 'OPEN_REVIEW' }
  | { type: 'MAINTENANCE_CREATED' }
  | { type: 'UNDO' }
  | { type: 'FINISH' }
  | { type: 'INVALID_QR' }
  | { type: 'CLEAR_INVALID_STATUS' }
  | { type: 'RESET' };

// ── Helpers ──────────────────────────────────────────────────────────────────

type ActiveState = Extract<ScanFlowState, { phase: 'active' }>;

export function shouldAutoComplete(state: ActiveState): boolean {
  if (state.activeSheet !== null || state.cameraOpen) return false;
  if (state.awaitingSheetExit) return false;
  if (state.confirmedAction === null) return false;
  return true;
}

function toCompleting(state: ActiveState): ScanFlowState {
  return {
    phase: 'completing',
    summary: {
      assetNumber: state.scannedAsset.assetNumber,
      depotName: state.matchedDepot?.depot.name ?? null,
      photoCompleted: state.photoCompleted,
      defectCompleted: state.defectCompleted,
      maintenanceCompleted: state.maintenanceCompleted,
    },
  };
}

// ── Initial state ────────────────────────────────────────────────────────────

export const initialScanFlowState: ScanFlowState = { phase: 'idle' };

// ── Reducer ──────────────────────────────────────────────────────────────────

export function scanFlowReducer(state: ScanFlowState, action: ScanFlowAction): ScanFlowState {
  switch (action.type) {
    // ── Scanning phase transitions ──

    case 'QR_DETECTED':
      if (state.phase !== 'idle' && state.phase !== 'scanning') return state;
      return { phase: 'scanning', scanStep: action.scanStep };

    case 'INVALID_QR':
      return { phase: 'scanning', scanStep: 'invalid' };

    case 'CLEAR_INVALID_STATUS':
      if (state.phase !== 'scanning') return state;
      return { phase: 'idle' };

    case 'UPDATE_SCAN_STEP':
      if (state.phase !== 'scanning') return state;
      return { ...state, scanStep: action.scanStep };

    case 'ASSET_FOUND':
      if (state.phase !== 'scanning') return state;
      return {
        phase: 'confirming',
        scannedAsset: action.scannedAsset,
        matchedDepot: action.matchedDepot,
        effectiveLocation: action.effectiveLocation,
        isCreatingScan: true,
      };

    case 'SCAN_CREATED':
      if (state.phase !== 'confirming') return state;
      if (state.pendingUndo) return { phase: 'idle' };
      return {
        phase: 'active',
        scannedAsset: state.scannedAsset,
        matchedDepot: state.matchedDepot,
        effectiveLocation: state.effectiveLocation,
        lastScanEventId: action.lastScanEventId,
        photoCompleted: false,
        defectCompleted: false,
        maintenanceCompleted: false,
        cameraOpen: false,
        activeSheet: null,
        confirmedAction: null,
        awaitingSheetExit: false,
        wantsPhotoAfterExit: false,
        capturedPhotoUri: null,
      };

    // ── Confirming / Active undo ──

    case 'UNDO':
      if (state.phase === 'confirming') {
        return { ...state, pendingUndo: true };
      }
      if (state.phase === 'active') {
        // Close any open sheet/camera and reset to idle
        return { phase: 'idle' };
      }
      return state;

    // ── Active phase: action selection ──

    case 'CONFIRM_ACTION': {
      if (state.phase !== 'active') return state;
      // Reject if a flow is already in progress
      if (state.activeSheet !== null || state.cameraOpen) return state;

      const act = action.action;
      if (act === null) {
        // "Done" — immediate completion
        return toCompleting(state);
      }
      if (act === 'photo') {
        return { ...state, confirmedAction: act, cameraOpen: true };
      }
      if (act === 'defect') {
        return { ...state, confirmedAction: act, activeSheet: 'defect' };
      }
      if (act === 'maintenance') {
        return { ...state, confirmedAction: act, activeSheet: 'createTask' };
      }
      return state;
    }

    case 'FINISH':
      if (state.phase !== 'active') return state;
      return toCompleting(state);

    // ── Camera ──

    case 'OPEN_CAMERA':
      if (state.phase !== 'active') return state;
      return { ...state, cameraOpen: true, awaitingSheetExit: false };

    case 'CAMERA_CAPTURED':
      if (state.phase !== 'active') return state;
      // Only close the camera and stash the URI — don't open review sheet yet.
      // The native Modal (CameraCapture) must fully dismiss before a gorhom
      // SheetModal can present.  useScanFlow schedules OPEN_REVIEW after a delay.
      return {
        ...state,
        cameraOpen: false,
        capturedPhotoUri: action.uri,
      };

    case 'OPEN_REVIEW':
      if (state.phase !== 'active') return state;
      if (!state.capturedPhotoUri) return state;
      return { ...state, activeSheet: 'review' };

    case 'CAMERA_CANCELLED': {
      if (state.phase !== 'active') return state;
      const primaryActionDone =
        (state.confirmedAction === 'defect' && state.defectCompleted) ||
        (state.confirmedAction === 'maintenance' && state.maintenanceCompleted);
      const next: ActiveState = {
        ...state,
        cameraOpen: false,
        confirmedAction: primaryActionDone ? state.confirmedAction : null,
        capturedPhotoUri: null,
      };
      if (shouldAutoComplete(next)) return toCompleting(next);
      return next;
    }

    // ── Sheet lifecycle ──

    case 'CLOSE_SHEET':
      if (state.phase !== 'active') return state;
      if (state.activeSheet === null) return state;
      return { ...state, activeSheet: null, awaitingSheetExit: true };

    case 'SHEET_EXIT_COMPLETE': {
      if (state.phase !== 'active') return state;
      // If defect wants photo, open camera instead of auto-completing
      if (state.wantsPhotoAfterExit) {
        return {
          ...state,
          awaitingSheetExit: false,
          wantsPhotoAfterExit: false,
          cameraOpen: true,
        };
      }
      const cleared: ActiveState = { ...state, awaitingSheetExit: false };
      if (shouldAutoComplete(cleared)) {
        return toCompleting(cleared);
      }
      return cleared;
    }

    case 'SHEET_DISMISSED': {
      if (state.phase !== 'active') return state;
      // If a compound action (DEFECT_SUBMITTED, PHOTO_FLOW_COMPLETE, MAINTENANCE_CREATED)
      // already set awaitingSheetExit, it owns the exit lifecycle — ignore the dismiss.
      if (state.awaitingSheetExit) return state;
      // Preserve confirmedAction when the primary action already completed (defect/maintenance
      // submitted) — the user is dismissing the optional photo review, not cancelling the flow.
      const primaryDone =
        (state.confirmedAction === 'defect' && state.defectCompleted) ||
        (state.confirmedAction === 'maintenance' && state.maintenanceCompleted);
      const next: ActiveState = {
        ...state,
        activeSheet: null,
        awaitingSheetExit: false,
        confirmedAction: primaryDone ? state.confirmedAction : null,
        capturedPhotoUri: null,
      };
      if (shouldAutoComplete(next)) return toCompleting(next);
      return next;
    }

    // ── Compound actions (from mutation onSuccess) ──

    case 'DEFECT_SUBMITTED': {
      if (state.phase !== 'active') return state;
      return {
        ...state,
        defectCompleted: true,
        activeSheet: null,
        awaitingSheetExit: true,
        wantsPhotoAfterExit: action.wantsPhoto,
      };
    }

    case 'PHOTO_FLOW_COMPLETE':
      if (state.phase !== 'active') return state;
      return {
        ...state,
        photoCompleted: true,
        activeSheet: null,
        awaitingSheetExit: true,
        capturedPhotoUri: null,
      };

    case 'RETAKE_PHOTO':
      if (state.phase !== 'active') return state;
      return {
        ...state,
        activeSheet: null,
        awaitingSheetExit: true,
        wantsPhotoAfterExit: true,
        capturedPhotoUri: null,
      };

    case 'MAINTENANCE_CREATED':
      if (state.phase !== 'active') return state;
      return {
        ...state,
        maintenanceCompleted: true,
        activeSheet: null,
        awaitingSheetExit: true,
      };

    // ── Reset ──

    case 'RESET':
      return { phase: 'idle' };

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
