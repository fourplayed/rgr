import type { Asset, Depot } from '@rgr/shared';
import type { CachedLocationData } from '../../store/locationStore';

// ── Types ────────────────────────────────────────────────────────────────────

export type MatchedDepot = { depot: Depot; distanceKm: number };

export type SheetId = 'camera' | 'review' | 'defect' | 'createTask' | null;

export type ScanFlowState =
  | { phase: 'idle' }
  | { phase: 'scanning'; scanStatus: string }
  | {
      phase: 'confirming';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
      isCreatingScan: boolean;
      pendingUndo?: boolean;
    }
  | {
      phase: 'active';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
      lastScanEventId: string;
      photoCompleted: boolean;
      defectCompleted: boolean;
      maintenanceCompleted: boolean;
      activeSheet: SheetId;
      pendingSheet: SheetId;
      selectedItemId: string | null;
    };

// ── Actions ──────────────────────────────────────────────────────────────────

export type ScanFlowAction =
  | { type: 'QR_DETECTED'; scanStatus: string }
  | { type: 'UPDATE_SCAN_STATUS'; scanStatus: string }
  | {
      type: 'ASSET_FOUND';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
    }
  | {
      type: 'SCAN_CREATED';
      lastScanEventId: string;
    }
  | { type: 'OPEN_SHEET'; sheet: SheetId; selectedItemId?: string }
  | { type: 'CLOSE_SHEET'; pendingSheet?: SheetId }
  | { type: 'RESOLVE_PENDING' }
  | { type: 'MARK_PHOTO_COMPLETED' }
  | { type: 'MARK_DEFECT_COMPLETED' }
  | { type: 'MARK_MAINTENANCE_COMPLETED' }
  | { type: 'INVALID_QR' }
  | { type: 'CLEAR_INVALID_STATUS' }
  | { type: 'REQUEST_UNDO' }
  | { type: 'RESET' };

// ── Initial state ────────────────────────────────────────────────────────────

export const initialScanFlowState: ScanFlowState = { phase: 'idle' };

// ── Reducer ──────────────────────────────────────────────────────────────────

export function scanFlowReducer(state: ScanFlowState, action: ScanFlowAction): ScanFlowState {
  switch (action.type) {
    case 'QR_DETECTED':
      if (state.phase !== 'idle' && state.phase !== 'scanning') return state;
      return { phase: 'scanning', scanStatus: action.scanStatus };

    case 'INVALID_QR':
      return { phase: 'scanning', scanStatus: 'Not a valid asset code' };

    case 'CLEAR_INVALID_STATUS':
      if (state.phase !== 'scanning') return state;
      return { phase: 'idle' };

    case 'UPDATE_SCAN_STATUS':
      if (state.phase !== 'scanning') return state;
      return { ...state, scanStatus: action.scanStatus };

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
      // If undo was queued during confirming, go straight to idle
      if (state.pendingUndo) {
        return { phase: 'idle' };
      }
      return {
        phase: 'active',
        scannedAsset: state.scannedAsset,
        matchedDepot: state.matchedDepot,
        effectiveLocation: state.effectiveLocation,
        lastScanEventId: action.lastScanEventId,
        photoCompleted: false,
        defectCompleted: false,
        maintenanceCompleted: false,
        activeSheet: null,
        pendingSheet: null,
        selectedItemId: null,
      };

    case 'REQUEST_UNDO':
      if (state.phase === 'confirming') {
        return { ...state, pendingUndo: true };
      }
      return state;

    case 'OPEN_SHEET': {
      if (state.phase !== 'active') return state;
      if (state.activeSheet !== null) {
        // Queue this sheet to open after the current one closes
        return {
          ...state,
          pendingSheet: action.sheet,
          selectedItemId: action.selectedItemId ?? state.selectedItemId,
        };
      }
      return {
        ...state,
        activeSheet: action.sheet,
        selectedItemId: action.selectedItemId ?? null,
      };
    }

    case 'CLOSE_SHEET':
      if (state.phase !== 'active') return state;
      return {
        ...state,
        activeSheet: null,
        pendingSheet: action.pendingSheet ?? state.pendingSheet,
      };

    case 'RESOLVE_PENDING':
      if (state.phase !== 'active' || !state.pendingSheet) return state;
      return {
        ...state,
        activeSheet: state.pendingSheet,
        pendingSheet: null,
      };

    case 'MARK_PHOTO_COMPLETED':
      if (state.phase !== 'active') return state;
      return { ...state, photoCompleted: true };

    case 'MARK_DEFECT_COMPLETED':
      if (state.phase !== 'active') return state;
      return { ...state, defectCompleted: true };

    case 'MARK_MAINTENANCE_COMPLETED':
      if (state.phase !== 'active') return state;
      return { ...state, maintenanceCompleted: true };

    case 'RESET':
      return { phase: 'idle' };

    default:
      return state;
  }
}
