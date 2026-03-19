import { buildAssetAssessment } from '../assetAssessment';
import { findDepotByLocationString } from '@rgr/shared';
import type {
  AssetWithRelations,
  MaintenanceRecordWithNames,
  PhotoListItem,
  DefectReportListItem,
} from '@rgr/shared';

jest.mock('@rgr/shared', () => ({
  ...jest.requireActual('@rgr/shared'),
  findDepotByLocationString: jest.fn(() => null),
}));

const NOW = new Date('2026-03-08T12:00:00Z');

// ── Factory helpers ──────────────────────────────────────────────────────────

const makeAsset = (overrides?: Partial<AssetWithRelations>): AssetWithRelations =>
  ({
    id: 'asset-1',
    assetNumber: 'T-001',
    category: 'trailer',
    subtype: 'Flattop',
    status: 'serviced',
    description: null,
    yearManufactured: 2020,
    make: 'Vawdrey',
    model: 'VB',
    vin: null,
    registrationNumber: 'ABC123',
    registrationExpiry: null,
    dotLookupStatus: null,
    dotLookupAt: null,
    dotLookupFailures: 0,
    registrationOverdue: false,
    lastLatitude: -31.95,
    lastLongitude: 115.86,
    lastLocationAccuracy: 10,
    lastLocationUpdatedAt: null,
    lastScannedBy: null,
    assignedDepotId: 'depot-1',
    assignedDriverId: null,
    qrCodeData: null,
    qrGeneratedAt: null,
    deletedAt: null,
    notes: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    depotName: 'Perth Depot',
    depotCode: 'PER',
    driverName: null,
    lastScannerName: null,
    photoCount: 0,
    ...overrides,
  }) satisfies AssetWithRelations;

const makeMaintenance = (
  overrides?: Partial<MaintenanceRecordWithNames>
): MaintenanceRecordWithNames =>
  ({
    id: 'maint-1',
    assetId: 'asset-1',
    reportedBy: null,
    assignedTo: null,
    completedBy: null,
    title: 'Routine service',
    description: null,
    priority: 'medium',
    status: 'scheduled',
    maintenanceType: null,
    scheduledDate: null,
    completedAt: null,
    dueDate: null,
    estimatedCost: null,
    actualCost: null,
    partsUsed: null,
    hazardAlertId: null,
    scanEventId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    reporterName: null,
    assigneeName: null,
    completerName: null,
    ...overrides,
  }) satisfies MaintenanceRecordWithNames;

const makePhoto = (overrides?: Partial<PhotoListItem>): PhotoListItem =>
  ({
    id: 'photo-1',
    storagePath: '/photos/photo-1.jpg',
    thumbnailPath: null,
    photoType: 'freight',
    createdAt: '2026-03-07T10:00:00Z',
    primaryCategory: null,
    confidence: null,
    hazardCount: 0,
    maxSeverity: null,
    requiresAcknowledgment: false,
    blockedFromDeparture: false,
    ...overrides,
  }) satisfies PhotoListItem;

const makeDefect = (overrides?: Partial<DefectReportListItem>): DefectReportListItem =>
  ({
    id: 'defect-1',
    assetId: 'asset-1',
    title: 'Cracked mudguard',
    description: null,
    status: 'reported',
    maintenanceRecordId: null,
    createdAt: '2026-03-06T10:00:00Z',
    reporterName: 'John',
    assetNumber: 'T-001',
    assetCategory: 'trailer',
    ...overrides,
  }) satisfies DefectReportListItem;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('buildAssetAssessment', () => {
  beforeEach(() => {
    jest.mocked(findDepotByLocationString).mockReturnValue(null);
  });

  it('reports serviced status as "in service with no issues"', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('in service with no issues');
  });

  it('reports maintenance status as "currently in for maintenance"', () => {
    const result = buildAssetAssessment({
      asset: makeAsset({ status: 'maintenance' }),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('currently in for maintenance');
  });

  it('reports out_of_service status as "out of service"', () => {
    const result = buildAssetAssessment({
      asset: makeAsset({ status: 'out_of_service' }),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('out of service');
  });

  it('shows raw status string for unknown status', () => {
    const result = buildAssetAssessment({
      asset: makeAsset({ status: 'decommissioned' as never }),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('"decommissioned"');
  });

  it('reports blocked photo as "blocked from departure"', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [makePhoto({ blockedFromDeparture: true })],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('blocked from departure');
  });

  it('reports high-severity hazards (plural)', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [
        makePhoto({ hazardCount: 2, maxSeverity: 'high' }),
        makePhoto({ id: 'photo-2', hazardCount: 1, maxSeverity: 'medium' }),
      ],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('3 hazards');
    expect(result).toContain('high-severity');
  });

  it('reports a single minor hazard', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [makePhoto({ hazardCount: 1, maxSeverity: 'low' })],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('1 minor hazard was picked up');
  });

  it('reports a single open defect', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      defectReports: [makeDefect()],
      now: NOW,
    });
    expect(result).toContain('open defect report');
  });

  it('reports multiple open defects', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      defectReports: [makeDefect(), makeDefect({ id: 'defect-2', status: 'task_created' })],
      now: NOW,
    });
    expect(result).toContain('2 open defect reports');
  });

  it('uses openDefectCount when provided (scan context shortcut)', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      openDefectCount: 3,
      now: NOW,
    });
    expect(result).toContain('3 open defect reports');
  });

  it('uses openDefectCount=1 for singular phrasing', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      openDefectCount: 1,
      now: NOW,
    });
    expect(result).toContain('open defect report');
    expect(result).not.toContain('open defect reports');
  });

  it('openDefectCount=0 does not report defects', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      openDefectCount: 0,
      now: NOW,
    });
    expect(result).not.toContain('defect');
  });

  it('reports overdue maintenance', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [
        makeMaintenance({
          status: 'scheduled',
          dueDate: '2026-03-01',
        }),
      ],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('overdue maintenance');
  });

  it('reports next scheduled maintenance', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [
        makeMaintenance({
          status: 'scheduled',
          scheduledDate: '2026-04-01',
        }),
      ],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('Next service is coming up on');
  });

  it('reports recently completed maintenance (3 days ago)', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [
        makeMaintenance({
          status: 'completed',
          completedAt: '2026-03-05T12:00:00Z',
        }),
      ],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('Last service was wrapped up');
  });

  it('includes task title for older completed maintenance (30 days ago)', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [
        makeMaintenance({
          title: 'Brake pad replacement',
          status: 'completed',
          completedAt: '2026-02-06T12:00:00Z',
        }),
      ],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('brake pad replacement');
  });

  it('falls back to "last scanned" when no maintenance but scanned', () => {
    const result = buildAssetAssessment({
      asset: makeAsset({
        lastLocationUpdatedAt: '2026-03-07T08:00:00Z',
        lastScannerName: 'Dave',
      }),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain('last scanned');
  });

  it('uses "but" connector for serviced status with an issue', () => {
    const result = buildAssetAssessment({
      asset: makeAsset({ status: 'serviced' }),
      maintenance: [],
      photos: [makePhoto({ blockedFromDeparture: true })],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toMatch(/in service, but/);
  });

  it('reports expired registration', () => {
    const result = buildAssetAssessment({
      asset: makeAsset({ registrationExpiry: '2026-02-01' }),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(result).toContain("Registration's been expired");
  });

  it('produces valid output with empty inputs (no crash)', () => {
    const result = buildAssetAssessment({
      asset: makeAsset(),
      maintenance: [],
      photos: [],
      scans: [],
      depots: [],
      now: NOW,
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
