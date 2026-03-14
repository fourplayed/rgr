import { scanFlowReducer, initialScanFlowState, shouldAutoComplete } from '../scanFlowMachine';
import type { ScanFlowState, MatchedDepot } from '../scanFlowMachine';
import type { Asset } from '@rgr/shared';
import type { CachedLocationData } from '../../../store/locationStore';

// ── Narrow types for phase-specific assertions ──

type ScanningState = Extract<ScanFlowState, { phase: 'scanning' }>;
type ConfirmingState = Extract<ScanFlowState, { phase: 'confirming' }>;
type ActiveState = Extract<ScanFlowState, { phase: 'active' }>;
type CompletingState = Extract<ScanFlowState, { phase: 'completing' }>;

// ── Test helpers ──

// SAFETY: Test stub — only fields used by the machine are populated
const makeAssetStub = (overrides = {}) => ({
  id: 'asset-1',
  assetNumber: 'T-001',
  ...overrides,
});

// SAFETY: Test stub — only fields used by the machine are populated
const makeLocation = (overrides = {}) => ({
  latitude: -31.95,
  longitude: 115.86,
  accuracy: 10,
  timestamp: Date.now(),
  ...overrides,
});

const makeDepotMatch = (overrides = {}): MatchedDepot => ({
  depot: {
    id: 'd1',
    name: 'Perth',
    code: 'PER',
    address: null,
    latitude: -31.95,
    longitude: 115.86,
    color: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  distanceKm: 0.5,
  ...overrides,
});

function buildActiveState(overrides: Partial<ActiveState> = {}): ActiveState {
  let s: ScanFlowState = scanFlowReducer(initialScanFlowState, {
    type: 'QR_DETECTED',
    scanStep: 'detected',
  });
  s = scanFlowReducer(s, {
    type: 'ASSET_FOUND',
    scannedAsset: makeAssetStub() as unknown as Asset,
    matchedDepot: makeDepotMatch(),
    effectiveLocation: makeLocation() as unknown as CachedLocationData,
  });
  s = scanFlowReducer(s, {
    type: 'SCAN_CREATED',
    lastScanEventId: 'scan-1',
  });
  return { ...(s as ActiveState), ...overrides };
}

// ── Tests ──

describe('scanFlowMachine', () => {
  // ── Scanning phase ──

  describe('scanning phase', () => {
    it('QR_DETECTED from idle transitions to scanning', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'QR_DETECTED',
        scanStep: 'detected',
      }) as ScanningState;
      expect(next.phase).toBe('scanning');
      expect(next.scanStep).toBe('detected');
    });

    it('ASSET_FOUND from idle is ignored', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'ASSET_FOUND',
        scannedAsset: makeAssetStub() as unknown as Asset,
        matchedDepot: makeDepotMatch(),
        effectiveLocation: makeLocation() as unknown as CachedLocationData,
      });
      expect(next).toBe(initialScanFlowState);
    });

    it('INVALID_QR sets error status', () => {
      const next = scanFlowReducer(initialScanFlowState, { type: 'INVALID_QR' }) as ScanningState;
      expect(next.scanStep).toBe('invalid');
    });

    it('CLEAR_INVALID_STATUS returns to idle', () => {
      const scanning = scanFlowReducer(initialScanFlowState, { type: 'INVALID_QR' });
      const next = scanFlowReducer(scanning, { type: 'CLEAR_INVALID_STATUS' });
      expect(next.phase).toBe('idle');
    });
  });

  // ── Confirming phase ──

  describe('confirming phase', () => {
    let confirming: ConfirmingState;

    beforeEach(() => {
      const s = scanFlowReducer(initialScanFlowState, {
        type: 'QR_DETECTED',
        scanStep: 'detected',
      });
      confirming = scanFlowReducer(s, {
        type: 'ASSET_FOUND',
        scannedAsset: makeAssetStub() as unknown as Asset,
        matchedDepot: makeDepotMatch(),
        effectiveLocation: makeLocation() as unknown as CachedLocationData,
      }) as ConfirmingState;
    });

    it('SCAN_CREATED transitions to active with all fields initialized', () => {
      const next = scanFlowReducer(confirming, {
        type: 'SCAN_CREATED',
        lastScanEventId: 'scan-1',
      }) as ActiveState;
      expect(next.phase).toBe('active');
      expect(next.photoCompleted).toBe(false);
      expect(next.defectCompleted).toBe(false);
      expect(next.maintenanceCompleted).toBe(false);
      expect(next.cameraOpen).toBe(false);
      expect(next.activeSheet).toBeNull();
      expect(next.confirmedAction).toBeNull();
      expect(next.awaitingSheetExit).toBe(false);
      expect(next.wantsPhotoAfterExit).toBe(false);
      expect(next.capturedPhotoUri).toBeNull();
    });

    it('UNDO during confirming sets pendingUndo', () => {
      const next = scanFlowReducer(confirming, { type: 'UNDO' }) as ConfirmingState;
      expect(next.pendingUndo).toBe(true);
    });

    it('SCAN_CREATED with pendingUndo returns to idle', () => {
      const withUndo = scanFlowReducer(confirming, { type: 'UNDO' });
      const next = scanFlowReducer(withUndo, {
        type: 'SCAN_CREATED',
        lastScanEventId: 'scan-1',
      });
      expect(next.phase).toBe('idle');
    });
  });

  // ── CONFIRM_ACTION compound action ──

  describe('CONFIRM_ACTION', () => {
    it('null action completes immediately', () => {
      const active = buildActiveState();
      const next = scanFlowReducer(active, {
        type: 'CONFIRM_ACTION',
        action: null,
      }) as CompletingState;
      expect(next.phase).toBe('completing');
      expect(next.summary.assetNumber).toBe('T-001');
    });

    it('photo action opens camera', () => {
      const active = buildActiveState();
      const next = scanFlowReducer(active, {
        type: 'CONFIRM_ACTION',
        action: 'photo',
      }) as ActiveState;
      expect(next.cameraOpen).toBe(true);
      expect(next.confirmedAction).toBe('photo');
    });

    it('defect action opens defect sheet', () => {
      const active = buildActiveState();
      const next = scanFlowReducer(active, {
        type: 'CONFIRM_ACTION',
        action: 'defect',
      }) as ActiveState;
      expect(next.activeSheet).toBe('defect');
      expect(next.confirmedAction).toBe('defect');
    });

    it('maintenance action opens createTask sheet', () => {
      const active = buildActiveState();
      const next = scanFlowReducer(active, {
        type: 'CONFIRM_ACTION',
        action: 'maintenance',
      }) as ActiveState;
      expect(next.activeSheet).toBe('createTask');
      expect(next.confirmedAction).toBe('maintenance');
    });

    it('rejects when sheet is already open', () => {
      const active = buildActiveState({ activeSheet: 'defect', confirmedAction: 'defect' });
      const next = scanFlowReducer(active, {
        type: 'CONFIRM_ACTION',
        action: 'photo',
      });
      expect(next).toBe(active);
    });

    it('rejects when camera is open', () => {
      const active = buildActiveState({ cameraOpen: true, confirmedAction: 'photo' });
      const next = scanFlowReducer(active, {
        type: 'CONFIRM_ACTION',
        action: 'defect',
      });
      expect(next).toBe(active);
    });

    it('rejects in wrong phase', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'CONFIRM_ACTION',
        action: 'photo',
      });
      expect(next).toBe(initialScanFlowState);
    });
  });

  // ── Photo flow ──

  describe('photo flow', () => {
    it('CAMERA_CAPTURED closes camera and stashes URI (no sheet yet)', () => {
      const active = buildActiveState({ cameraOpen: true, confirmedAction: 'photo' });
      const next = scanFlowReducer(active, {
        type: 'CAMERA_CAPTURED',
        uri: 'file:///photo.jpg',
      }) as ActiveState;
      expect(next.cameraOpen).toBe(false);
      expect(next.activeSheet).toBeNull();
      expect(next.capturedPhotoUri).toBe('file:///photo.jpg');
    });

    it('OPEN_REVIEW opens review sheet after camera dismiss', () => {
      const active = buildActiveState({
        confirmedAction: 'photo',
        capturedPhotoUri: 'file:///photo.jpg',
      });
      const next = scanFlowReducer(active, { type: 'OPEN_REVIEW' }) as ActiveState;
      expect(next.activeSheet).toBe('review');
    });

    it('OPEN_REVIEW is no-op without capturedPhotoUri', () => {
      const active = buildActiveState({ confirmedAction: 'photo' });
      const next = scanFlowReducer(active, { type: 'OPEN_REVIEW' });
      expect(next).toBe(active);
    });

    it('CAMERA_CANCELLED clears confirmedAction when no primary action done', () => {
      const active = buildActiveState({ cameraOpen: true, confirmedAction: 'photo' });
      const next = scanFlowReducer(active, { type: 'CAMERA_CANCELLED' }) as ActiveState;
      expect(next.cameraOpen).toBe(false);
      expect(next.confirmedAction).toBeNull();
      expect(next.capturedPhotoUri).toBeNull();
    });

    it('CAMERA_CANCELLED after defect submitted preserves confirmedAction and auto-completes', () => {
      const active = buildActiveState({
        cameraOpen: true,
        confirmedAction: 'defect',
        defectCompleted: true,
      });
      const result = scanFlowReducer(active, { type: 'CAMERA_CANCELLED' });
      expect(result.phase).toBe('completing');
      expect((result as CompletingState).summary.defectCompleted).toBe(true);
    });

    it('full photo flow: CAMERA_CAPTURED → OPEN_REVIEW → confirm → auto-complete', () => {
      const active = buildActiveState({ cameraOpen: true, confirmedAction: 'photo' });
      // 1. Camera captures — only closes camera
      let s = scanFlowReducer(active, {
        type: 'CAMERA_CAPTURED',
        uri: 'file:///photo.jpg',
      }) as ActiveState;
      expect(s.cameraOpen).toBe(false);
      expect(s.activeSheet).toBeNull();
      // 2. OPEN_REVIEW after Modal dismiss delay
      s = scanFlowReducer(s, { type: 'OPEN_REVIEW' }) as ActiveState;
      expect(s.activeSheet).toBe('review');
      // 3. Confirm photo
      s = scanFlowReducer(s, { type: 'PHOTO_FLOW_COMPLETE' }) as ActiveState;
      expect(s.photoCompleted).toBe(true);
      expect(s.activeSheet).toBeNull();
      expect(s.awaitingSheetExit).toBe(true);
      // 4. Sheet exits → auto-complete
      const result = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect(result.phase).toBe('completing');
    });

    it('RETAKE_PHOTO sets awaitingSheetExit and wantsPhotoAfterExit', () => {
      const active = buildActiveState({
        activeSheet: 'review',
        confirmedAction: 'photo',
        capturedPhotoUri: 'file:///photo.jpg',
      });
      const next = scanFlowReducer(active, { type: 'RETAKE_PHOTO' }) as ActiveState;
      expect(next.activeSheet).toBeNull();
      expect(next.awaitingSheetExit).toBe(true);
      expect(next.wantsPhotoAfterExit).toBe(true);
      expect(next.capturedPhotoUri).toBeNull();
    });

    it('RETAKE_PHOTO → SHEET_EXIT_COMPLETE opens camera with clean awaitingSheetExit', () => {
      const active = buildActiveState({
        activeSheet: 'review',
        confirmedAction: 'photo',
        capturedPhotoUri: 'file:///photo.jpg',
      });
      let s = scanFlowReducer(active, { type: 'RETAKE_PHOTO' }) as ActiveState;
      s = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' }) as ActiveState;
      expect(s.phase).toBe('active');
      expect(s.cameraOpen).toBe(true);
      expect(s.awaitingSheetExit).toBe(false);
      expect(s.wantsPhotoAfterExit).toBe(false);
    });

    it('full retake cycle: capture → retake → recapture → confirm', () => {
      let s: ScanFlowState = buildActiveState({ confirmedAction: 'photo', cameraOpen: true });
      // 1. First capture + review open
      s = scanFlowReducer(s, { type: 'CAMERA_CAPTURED', uri: 'file:///photo1.jpg' });
      s = scanFlowReducer(s, { type: 'OPEN_REVIEW' });
      expect((s as ActiveState).activeSheet).toBe('review');
      // 2. Retake
      s = scanFlowReducer(s, { type: 'RETAKE_PHOTO' });
      s = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect((s as ActiveState).cameraOpen).toBe(true);
      // 3. Second capture + review open
      s = scanFlowReducer(s, { type: 'CAMERA_CAPTURED', uri: 'file:///photo2.jpg' });
      s = scanFlowReducer(s, { type: 'OPEN_REVIEW' });
      expect((s as ActiveState).activeSheet).toBe('review');
      // 4. Confirm
      s = scanFlowReducer(s, { type: 'PHOTO_FLOW_COMPLETE' });
      s = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect(s.phase).toBe('completing');
      expect((s as CompletingState).summary.photoCompleted).toBe(true);
    });

    it('OPEN_CAMERA clears awaitingSheetExit', () => {
      const active = buildActiveState({ awaitingSheetExit: true });
      const next = scanFlowReducer(active, { type: 'OPEN_CAMERA' }) as ActiveState;
      expect(next.cameraOpen).toBe(true);
      expect(next.awaitingSheetExit).toBe(false);
    });
  });

  // ── Defect flow ──

  describe('defect flow', () => {
    it('DEFECT_SUBMITTED without photo → auto-completes after sheet exit', () => {
      const active = buildActiveState({
        activeSheet: 'defect',
        confirmedAction: 'defect',
      });
      const s = scanFlowReducer(active, {
        type: 'DEFECT_SUBMITTED',
        wantsPhoto: false,
      }) as ActiveState;
      expect(s.defectCompleted).toBe(true);
      expect(s.awaitingSheetExit).toBe(true);

      const result = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect(result.phase).toBe('completing');
    });

    it('DEFECT_SUBMITTED with photo → opens camera after sheet exit', () => {
      const active = buildActiveState({
        activeSheet: 'defect',
        confirmedAction: 'defect',
      });
      let s = scanFlowReducer(active, {
        type: 'DEFECT_SUBMITTED',
        wantsPhoto: true,
      }) as ActiveState;
      expect(s.defectCompleted).toBe(true);
      expect(s.wantsPhotoAfterExit).toBe(true);

      s = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' }) as ActiveState;
      expect(s.phase).toBe('active');
      expect(s.cameraOpen).toBe(true);
      expect(s.wantsPhotoAfterExit).toBe(false);
    });

    it('defect + photo full chain completes', () => {
      let s: ScanFlowState = buildActiveState({
        activeSheet: 'defect',
        confirmedAction: 'defect',
      });
      // 1. Submit defect with photo
      s = scanFlowReducer(s, { type: 'DEFECT_SUBMITTED', wantsPhoto: true });
      // 2. Defect sheet exits → camera opens
      s = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect((s as ActiveState).cameraOpen).toBe(true);
      // 3. Camera captures
      s = scanFlowReducer(s, { type: 'CAMERA_CAPTURED', uri: 'file:///photo.jpg' });
      expect((s as ActiveState).activeSheet).toBeNull();
      // 4. Review opens after delay
      s = scanFlowReducer(s, { type: 'OPEN_REVIEW' });
      expect((s as ActiveState).activeSheet).toBe('review');
      // 5. Photo confirmed
      s = scanFlowReducer(s, { type: 'PHOTO_FLOW_COMPLETE' });
      // 6. Review sheet exits
      s = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect(s.phase).toBe('completing');
      const summary = (s as CompletingState).summary;
      expect(summary.defectCompleted).toBe(true);
      expect(summary.photoCompleted).toBe(true);
    });
  });

  // ── Maintenance flow ──

  describe('maintenance flow', () => {
    it('MAINTENANCE_CREATED → SHEET_EXIT_COMPLETE auto-completes', () => {
      const active = buildActiveState({
        activeSheet: 'createTask',
        confirmedAction: 'maintenance',
      });
      const s = scanFlowReducer(active, { type: 'MAINTENANCE_CREATED' }) as ActiveState;
      expect(s.maintenanceCompleted).toBe(true);
      expect(s.awaitingSheetExit).toBe(true);

      const result = scanFlowReducer(s, { type: 'SHEET_EXIT_COMPLETE' });
      expect(result.phase).toBe('completing');
    });
  });

  // ── Sheet lifecycle ──

  describe('sheet lifecycle', () => {
    it('SHEET_DISMISSED clears confirmedAction when no primary action done', () => {
      const active = buildActiveState({
        activeSheet: 'defect',
        confirmedAction: 'defect',
      });
      const next = scanFlowReducer(active, { type: 'SHEET_DISMISSED' }) as ActiveState;
      expect(next.activeSheet).toBeNull();
      expect(next.confirmedAction).toBeNull();
      expect(next.awaitingSheetExit).toBe(false);
    });

    it('SHEET_DISMISSED after defect submitted preserves confirmedAction and auto-completes', () => {
      const active = buildActiveState({
        activeSheet: 'review',
        confirmedAction: 'defect',
        defectCompleted: true,
      });
      const result = scanFlowReducer(active, { type: 'SHEET_DISMISSED' });
      expect(result.phase).toBe('completing');
      expect((result as CompletingState).summary.defectCompleted).toBe(true);
    });

    it('SHEET_DISMISSED is ignored when awaitingSheetExit is true', () => {
      // Simulates: compound action (e.g. MAINTENANCE_CREATED) sets awaitingSheetExit,
      // then the modal's internal onClose fires SHEET_DISMISSED — should be a no-op.
      const active = buildActiveState({
        activeSheet: 'createTask',
        confirmedAction: 'maintenance',
      });
      const afterCreated = scanFlowReducer(active, { type: 'MAINTENANCE_CREATED' }) as ActiveState;
      expect(afterCreated.awaitingSheetExit).toBe(true);
      expect(afterCreated.maintenanceCompleted).toBe(true);

      // SHEET_DISMISSED should NOT clobber the compound action's state
      const afterDismiss = scanFlowReducer(afterCreated, {
        type: 'SHEET_DISMISSED',
      }) as ActiveState;
      expect(afterDismiss.awaitingSheetExit).toBe(true);
      expect(afterDismiss.confirmedAction).toBe('maintenance');
      expect(afterDismiss.maintenanceCompleted).toBe(true);

      // SHEET_EXIT_COMPLETE should still auto-complete
      const result = scanFlowReducer(afterDismiss, { type: 'SHEET_EXIT_COMPLETE' });
      expect(result.phase).toBe('completing');
    });

    it('double SHEET_DISMISSED is idempotent', () => {
      const active = buildActiveState({
        activeSheet: 'defect',
        confirmedAction: 'defect',
      });
      const first = scanFlowReducer(active, { type: 'SHEET_DISMISSED' }) as ActiveState;
      const second = scanFlowReducer(first, { type: 'SHEET_DISMISSED' }) as ActiveState;
      expect(second.activeSheet).toBeNull();
      expect(second.confirmedAction).toBeNull();
    });

    it('CLOSE_SHEET sets awaitingSheetExit', () => {
      const active = buildActiveState({ activeSheet: 'defect' });
      const next = scanFlowReducer(active, { type: 'CLOSE_SHEET' }) as ActiveState;
      expect(next.activeSheet).toBeNull();
      expect(next.awaitingSheetExit).toBe(true);
    });

    it('CLOSE_SHEET with no active sheet is no-op', () => {
      const active = buildActiveState();
      const next = scanFlowReducer(active, { type: 'CLOSE_SHEET' });
      expect(next).toBe(active);
    });
  });

  // ── UNDO ──

  describe('UNDO', () => {
    it('in active phase resets to idle', () => {
      const active = buildActiveState({ activeSheet: 'defect', cameraOpen: false });
      const next = scanFlowReducer(active, { type: 'UNDO' });
      expect(next.phase).toBe('idle');
    });

    it('in idle is no-op', () => {
      const next = scanFlowReducer(initialScanFlowState, { type: 'UNDO' });
      expect(next).toBe(initialScanFlowState);
    });
  });

  // ── shouldAutoComplete predicate ──

  describe('shouldAutoComplete', () => {
    it('returns true when confirmed action set, no sheet, no camera, not awaiting', () => {
      const state = buildActiveState({ confirmedAction: 'photo' });
      expect(shouldAutoComplete(state)).toBe(true);
    });

    it('returns false when activeSheet is open', () => {
      const state = buildActiveState({ confirmedAction: 'photo', activeSheet: 'review' });
      expect(shouldAutoComplete(state)).toBe(false);
    });

    it('returns false when camera is open', () => {
      const state = buildActiveState({ confirmedAction: 'photo', cameraOpen: true });
      expect(shouldAutoComplete(state)).toBe(false);
    });

    it('returns false when awaitingSheetExit', () => {
      const state = buildActiveState({ confirmedAction: 'photo', awaitingSheetExit: true });
      expect(shouldAutoComplete(state)).toBe(false);
    });

    it('returns false when confirmedAction is null (done not yet pressed)', () => {
      const state = buildActiveState({ confirmedAction: null });
      expect(shouldAutoComplete(state)).toBe(false);
    });
  });

  // ── Phase guards ──

  describe('phase guards', () => {
    it('CONFIRM_ACTION ignored in scanning phase', () => {
      const scanning: ScanFlowState = { phase: 'scanning', scanStep: 'lookup' };
      const next = scanFlowReducer(scanning, { type: 'CONFIRM_ACTION', action: 'photo' });
      expect(next).toBe(scanning);
    });

    it('CAMERA_CAPTURED ignored in idle', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'CAMERA_CAPTURED',
        uri: 'file:///x.jpg',
      });
      expect(next).toBe(initialScanFlowState);
    });

    it('SHEET_EXIT_COMPLETE ignored in completing phase', () => {
      const completing: ScanFlowState = {
        phase: 'completing',
        summary: {
          assetNumber: 'T-001',
          depotName: null,
          photoCompleted: false,
          defectCompleted: false,
          maintenanceCompleted: false,
        },
      };
      const next = scanFlowReducer(completing, { type: 'SHEET_EXIT_COMPLETE' });
      expect(next).toBe(completing);
    });

    it('DEFECT_SUBMITTED ignored outside active phase', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'DEFECT_SUBMITTED',
        wantsPhoto: false,
      });
      expect(next).toBe(initialScanFlowState);
    });
  });

  // ── Completion summary ──

  describe('completion summary', () => {
    it('captures depot name from matched depot', () => {
      const active = buildActiveState({ confirmedAction: 'photo', photoCompleted: true });
      const result = scanFlowReducer(active, { type: 'FINISH' }) as CompletingState;
      expect(result.summary.depotName).toBe('Perth');
    });

    it('captures null depot when no match', () => {
      const active = buildActiveState({
        confirmedAction: 'photo',
        photoCompleted: true,
        matchedDepot: null,
      });
      const result = scanFlowReducer(active, { type: 'FINISH' }) as CompletingState;
      expect(result.summary.depotName).toBeNull();
    });
  });
});
