import { scanFlowReducer, initialScanFlowState } from '../scanFlowReducer';
import type { ScanFlowState, MatchedDepot } from '../scanFlowReducer';

// Narrow types for phase-specific assertions
type ScanningState = Extract<ScanFlowState, { phase: 'scanning' }>;
type ConfirmingState = Extract<ScanFlowState, { phase: 'confirming' }>;
type ActiveState = Extract<ScanFlowState, { phase: 'active' }>;

const makeAssetStub = (overrides = {}) => ({
  id: 'asset-1',
  assetNumber: 'T-001',
  ...overrides,
});

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

function buildActiveState(): ActiveState {
  let s: ScanFlowState = scanFlowReducer(initialScanFlowState, {
    type: 'QR_DETECTED',
    scanStatus: 'Looking up...',
  });
  s = scanFlowReducer(s, {
    type: 'ASSET_FOUND',
    scannedAsset: makeAssetStub() as any,
    matchedDepot: makeDepotMatch(),
    effectiveLocation: makeLocation() as any,
  });
  s = scanFlowReducer(s, {
    type: 'SCAN_CREATED',
    lastScanEventId: 'scan-1',
  });
  return s as ActiveState;
}

describe('scanFlowReducer', () => {
  describe('from idle', () => {
    it('QR_DETECTED transitions to scanning with scanStatus', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'QR_DETECTED',
        scanStatus: 'Looking up...',
      }) as ScanningState;
      expect(next.phase).toBe('scanning');
      expect(next.scanStatus).toBe('Looking up...');
    });

    it('ASSET_FOUND from idle is ignored (returns same reference)', () => {
      const next = scanFlowReducer(initialScanFlowState, {
        type: 'ASSET_FOUND',
        scannedAsset: makeAssetStub() as any,
        matchedDepot: makeDepotMatch(),
        effectiveLocation: makeLocation() as any,
      });
      expect(next).toBe(initialScanFlowState);
    });

    it('RESET from idle returns idle', () => {
      const next = scanFlowReducer(initialScanFlowState, { type: 'RESET' });
      expect(next).toEqual({ phase: 'idle' });
    });
  });

  describe('from scanning', () => {
    const scanningState: ScanningState = scanFlowReducer(initialScanFlowState, {
      type: 'QR_DETECTED',
      scanStatus: 'Looking up...',
    }) as ScanningState;

    it('QR_DETECTED re-detection updates scanStatus', () => {
      const next = scanFlowReducer(scanningState, {
        type: 'QR_DETECTED',
        scanStatus: 'Re-scanning...',
      }) as ScanningState;
      expect(next.phase).toBe('scanning');
      expect(next.scanStatus).toBe('Re-scanning...');
    });

    it('UPDATE_SCAN_STATUS updates status text', () => {
      const next = scanFlowReducer(scanningState, {
        type: 'UPDATE_SCAN_STATUS',
        scanStatus: 'Fetching asset...',
      }) as ScanningState;
      expect(next.scanStatus).toBe('Fetching asset...');
    });

    it('ASSET_FOUND transitions to confirming with asset, depot, location, isCreatingScan', () => {
      const asset = makeAssetStub() as any;
      const depot = makeDepotMatch();
      const location = makeLocation() as any;
      const next = scanFlowReducer(scanningState, {
        type: 'ASSET_FOUND',
        scannedAsset: asset,
        matchedDepot: depot,
        effectiveLocation: location,
      }) as ConfirmingState;
      expect(next.phase).toBe('confirming');
      expect(next.scannedAsset).toBe(asset);
      expect(next.matchedDepot).toBe(depot);
      expect(next.effectiveLocation).toBe(location);
      expect(next.isCreatingScan).toBe(true);
    });

    it('INVALID_QR sets scanStatus to error message', () => {
      const next = scanFlowReducer(scanningState, { type: 'INVALID_QR' }) as ScanningState;
      expect(next.phase).toBe('scanning');
      expect(next.scanStatus).toBe('Not a valid asset code');
    });

    it('CLEAR_INVALID_STATUS returns to idle', () => {
      const invalidState = scanFlowReducer(scanningState, { type: 'INVALID_QR' });
      const next = scanFlowReducer(invalidState, { type: 'CLEAR_INVALID_STATUS' });
      expect(next.phase).toBe('idle');
    });
  });

  describe('from confirming', () => {
    let confirmingState: ConfirmingState;

    beforeEach(() => {
      const s = scanFlowReducer(initialScanFlowState, {
        type: 'QR_DETECTED',
        scanStatus: 'Looking up...',
      });
      confirmingState = scanFlowReducer(s, {
        type: 'ASSET_FOUND',
        scannedAsset: makeAssetStub() as any,
        matchedDepot: makeDepotMatch(),
        effectiveLocation: makeLocation() as any,
      }) as ConfirmingState;
    });

    it('SCAN_CREATED transitions to active with all flags false and sheets null', () => {
      const next = scanFlowReducer(confirmingState, {
        type: 'SCAN_CREATED',
        lastScanEventId: 'scan-1',
      }) as ActiveState;
      expect(next.phase).toBe('active');
      expect(next.photoCompleted).toBe(false);
      expect(next.defectCompleted).toBe(false);
      expect(next.maintenanceCompleted).toBe(false);
      expect(next.activeSheet).toBeNull();
      expect(next.pendingSheet).toBeNull();
    });

    it('SCAN_CREATED with pendingUndo transitions to idle', () => {
      const withUndo = scanFlowReducer(confirmingState, { type: 'REQUEST_UNDO' });
      const next = scanFlowReducer(withUndo, {
        type: 'SCAN_CREATED',
        lastScanEventId: 'scan-1',
      });
      expect(next.phase).toBe('idle');
    });

    it('REQUEST_UNDO sets pendingUndo to true', () => {
      const next = scanFlowReducer(confirmingState, {
        type: 'REQUEST_UNDO',
      }) as ConfirmingState;
      expect(next.pendingUndo).toBe(true);
    });
  });

  describe('from active', () => {
    let activeState: ActiveState;

    beforeEach(() => {
      activeState = buildActiveState();
      expect(activeState.phase).toBe('active');
    });

    it('OPEN_SHEET when no active sheet sets activeSheet', () => {
      const next = scanFlowReducer(activeState, {
        type: 'OPEN_SHEET',
        sheet: 'camera',
      }) as ActiveState;
      expect(next.activeSheet).toBe('camera');
    });

    it('OPEN_SHEET when sheet already open queues as pendingSheet', () => {
      let s = scanFlowReducer(activeState, {
        type: 'OPEN_SHEET',
        sheet: 'camera',
      }) as ActiveState;
      s = scanFlowReducer(s, {
        type: 'OPEN_SHEET',
        sheet: 'defect',
      }) as ActiveState;
      expect(s.activeSheet).toBe('camera');
      expect(s.pendingSheet).toBe('defect');
    });

    it('OPEN_SHEET with selectedItemId', () => {
      const next = scanFlowReducer(activeState, {
        type: 'OPEN_SHEET',
        sheet: 'defect',
        selectedItemId: 'item-42',
      }) as ActiveState;
      expect(next.activeSheet).toBe('defect');
      expect(next.selectedItemId).toBe('item-42');
    });

    it('CLOSE_SHEET clears activeSheet', () => {
      let s = scanFlowReducer(activeState, {
        type: 'OPEN_SHEET',
        sheet: 'camera',
      }) as ActiveState;
      s = scanFlowReducer(s, { type: 'CLOSE_SHEET' }) as ActiveState;
      expect(s.activeSheet).toBeNull();
    });

    it('RESOLVE_PENDING promotes pending to active', () => {
      let s = scanFlowReducer(activeState, {
        type: 'OPEN_SHEET',
        sheet: 'camera',
      }) as ActiveState;
      s = scanFlowReducer(s, {
        type: 'OPEN_SHEET',
        sheet: 'defect',
      }) as ActiveState;
      expect(s.pendingSheet).toBe('defect');
      s = scanFlowReducer(s, { type: 'RESOLVE_PENDING' }) as ActiveState;
      expect(s.activeSheet).toBe('defect');
      expect(s.pendingSheet).toBeNull();
    });

    it('MARK_PHOTO_COMPLETED sets photoCompleted to true', () => {
      const next = scanFlowReducer(activeState, {
        type: 'MARK_PHOTO_COMPLETED',
      }) as ActiveState;
      expect(next.photoCompleted).toBe(true);
    });

    it('MARK_DEFECT_COMPLETED sets defectCompleted to true', () => {
      const next = scanFlowReducer(activeState, {
        type: 'MARK_DEFECT_COMPLETED',
      }) as ActiveState;
      expect(next.defectCompleted).toBe(true);
    });

    it('MARK_MAINTENANCE_COMPLETED sets maintenanceCompleted to true', () => {
      const next = scanFlowReducer(activeState, {
        type: 'MARK_MAINTENANCE_COMPLETED',
      }) as ActiveState;
      expect(next.maintenanceCompleted).toBe(true);
    });

    it('RESET from active returns to idle', () => {
      const next = scanFlowReducer(activeState, { type: 'RESET' });
      expect(next.phase).toBe('idle');
      expect(next).toEqual(initialScanFlowState);
    });
  });
});
