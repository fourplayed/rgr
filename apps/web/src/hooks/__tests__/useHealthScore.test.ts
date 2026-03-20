/**
 * useHealthScore Hook Tests
 *
 * TDD tests for the fleet health score React Query hooks.
 * Covers: successful data fetch, error state, score computation, staleTime, query key structure,
 *         and health score drop notification triggers.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock @rgr/shared ──────────────────────────────────────────────────────────

const mockGetFleetStatistics = vi.fn();
const mockGetOutstandingAssets = vi.fn();
const mockGetHazardClearanceRate = vi.fn();
const mockGetMaintenanceStats = vi.fn();
const mockGetDepotHealthScores = vi.fn();
const mockCreateNotification = vi.fn();
const mockGetNotifications = vi.fn();

vi.mock('@rgr/shared', () => ({
  getFleetStatistics: (...args: unknown[]) => mockGetFleetStatistics(...args),
  getOutstandingAssets: (...args: unknown[]) => mockGetOutstandingAssets(...args),
  getHazardClearanceRate: (...args: unknown[]) => mockGetHazardClearanceRate(...args),
  getMaintenanceStats: (...args: unknown[]) => mockGetMaintenanceStats(...args),
  getDepotHealthScores: (...args: unknown[]) => mockGetDepotHealthScores(...args),
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
}));

// ── Mock useAuthStore ─────────────────────────────────────────────────────────

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'user-test-123' } })
  ),
}));

// ── Test wrapper with fresh QueryClient ───────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

// ── Import hooks after mocks are set up ───────────────────────────────────────

import { useFleetHealthScore, useDepotHealthScores, HEALTH_QUERY_KEYS } from '../useHealthScore';

// ── Sample data ───────────────────────────────────────────────────────────────

const FLEET_STATS_DATA = {
  totalAssets: 100,
  activeAssets: 80,
  inMaintenance: 10,
  outOfService: 10,
  trailerCount: 70,
  dollyCount: 30,
};

const OUTSTANDING_ASSETS_DATA = [
  {
    id: 'asset-1',
    assetNumber: 'A001',
    category: 'trailer',
    status: 'serviced',
    lastScanDate: '2026-01-01',
    daysSinceLastScan: 78,
    lastLocation: null,
  },
  {
    id: 'asset-2',
    assetNumber: 'A002',
    category: 'dolly',
    status: 'maintenance',
    lastScanDate: null,
    daysSinceLastScan: null,
    lastLocation: null,
  },
];

const HAZARD_CLEARANCE_RATE = 80;

const MAINTENANCE_STATS_DATA = {
  total: 50,
  scheduled: 30,
  completed: 15,
  cancelled: 5,
  overdue: 10,
};

const DEPOT_HEALTH_SCORES_DATA = [
  {
    depotId: 'depot-1',
    depotName: 'Depot Alpha',
    scanCompliance: 95,
    hazardClearance: 88,
    maintenanceCurrency: 100,
    overallScore: 93.6,
  },
  {
    depotId: 'depot-2',
    depotName: 'Depot Beta',
    scanCompliance: 60,
    hazardClearance: 70,
    maintenanceCurrency: 80,
    overallScore: 68,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useFleetHealthScore ───────────────────────────────────────────────────────

describe('useFleetHealthScore', () => {
  it('returns computed health score data on successful fetch', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({
      success: true,
      data: OUTSTANDING_ASSETS_DATA,
      error: null,
    });
    mockGetHazardClearanceRate.mockResolvedValue({
      success: true,
      data: HAZARD_CLEARANCE_RATE,
      error: null,
    });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: MAINTENANCE_STATS_DATA,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // scanCompliance: (100 - 2) / 100 * 100 = 98
    // hazardClearance: 80
    // maintenanceCurrency: (50 - 10) / 50 * 100 = 80
    // overallScore: round(98 * 0.4 + 80 * 0.4 + 80 * 0.2) = round(39.2 + 32 + 16) = round(87.2) = 87
    expect(result.current.data).toMatchObject({
      scanCompliance: 98,
      hazardClearance: 80,
      maintenanceCurrency: 80,
      overallScore: 87,
      status: 'attention',
    });
  });

  it('calls getOutstandingAssets with 30 day window', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 0, scheduled: 0, completed: 0, cancelled: 0, overdue: 0 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetOutstandingAssets).toHaveBeenCalledWith(30);
  });

  it('returns status healthy when overallScore >= 90', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    // No outstanding assets → scanCompliance = 100
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    // hazardClearance = 100
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    // No overdue → maintenanceCurrency = 100
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 10, scheduled: 10, completed: 0, cancelled: 0, overdue: 0 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.overallScore).toBe(100);
    expect(result.current.data?.status).toBe('healthy');
  });

  it('returns status at_risk when overallScore < 70', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    // 50 out of 100 outstanding → scanCompliance = 50
    mockGetOutstandingAssets.mockResolvedValue({
      success: true,
      data: Array(50).fill({
        id: 'x',
        assetNumber: 'X',
        category: 'trailer',
        status: 'serviced',
        lastScanDate: null,
        daysSinceLastScan: null,
        lastLocation: null,
      }),
      error: null,
    });
    // hazardClearance = 50
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 50, error: null });
    // maintenanceCurrency = 50
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 10, scheduled: 5, completed: 0, cancelled: 0, overdue: 5 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // overallScore = round(50 * 0.4 + 50 * 0.4 + 50 * 0.2) = 50
    expect(result.current.data?.overallScore).toBe(50);
    expect(result.current.data?.status).toBe('at_risk');
  });

  it('returns status healthy at exact boundary score of 90', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    // No outstanding assets → scanCompliance = 100
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    // hazardClearance = 75
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 75, error: null });
    // No overdue → maintenanceCurrency = 100
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 100, scheduled: 100, completed: 0, cancelled: 0, overdue: 0 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // overallScore = round(100 * 0.4 + 75 * 0.4 + 100 * 0.2) = round(40 + 30 + 20) = 90
    expect(result.current.data?.overallScore).toBe(90);
    expect(result.current.data?.status).toBe('healthy');
  });

  it('returns status attention at exact boundary score of 70', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    // No outstanding assets → scanCompliance = 100
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    // hazardClearance = 50
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 50, error: null });
    // 5 overdue out of 10 → maintenanceCurrency = 50
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 10, scheduled: 5, completed: 0, cancelled: 0, overdue: 5 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // overallScore = round(100 * 0.4 + 50 * 0.4 + 50 * 0.2) = round(40 + 20 + 10) = 70
    expect(result.current.data?.overallScore).toBe(70);
    expect(result.current.data?.status).toBe('attention');
  });

  it('handles zero total assets gracefully (scanCompliance = 100)', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: { ...FLEET_STATS_DATA, totalAssets: 0 },
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 0, scheduled: 0, completed: 0, cancelled: 0, overdue: 0 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.scanCompliance).toBe(100);
    expect(result.current.data?.maintenanceCurrency).toBe(100);
  });

  it('enters error state when getFleetStatistics fails', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch fleet statistics: connection refused',
    });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: MAINTENANCE_STATS_DATA,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Failed to fetch fleet statistics');
  });

  it('enters error state when getOutstandingAssets fails', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch outstanding assets: timeout',
    });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: MAINTENANCE_STATS_DATA,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to fetch outstanding assets');
  });

  it('enters error state when getHazardClearanceRate fails', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch hazard clearance rate: permission denied',
    });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: MAINTENANCE_STATS_DATA,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain(
      'Failed to fetch hazard clearance rate'
    );
  });

  it('enters error state when getMaintenanceStats fails', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch maintenance stats: network error',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to fetch maintenance stats');
  });

  it('uses correct static query key', () => {
    expect(HEALTH_QUERY_KEYS.fleet()).toEqual(['health', 'fleet']);
  });

  it('uses staleTime of 2 minutes (120_000 ms)', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: FLEET_STATS_DATA,
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 100, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: MAINTENANCE_STATS_DATA,
      error: null,
    });

    const { wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: HEALTH_QUERY_KEYS.fleet(),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(2 * 60 * 1000);
  });
});

// ── useDepotHealthScores ──────────────────────────────────────────────────────

describe('useDepotHealthScores', () => {
  it('returns per-depot health score data on successful fetch', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: DEPOT_HEALTH_SCORES_DATA,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DEPOT_HEALTH_SCORES_DATA);
    expect(result.current.data).toHaveLength(2);
  });

  it('enters error state when service returns failure', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch depot health scores: insufficient permissions',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain(
      'Failed to fetch depot health scores'
    );
  });

  it('uses correct static query key', () => {
    expect(HEALTH_QUERY_KEYS.depots()).toEqual(['health', 'depots']);
  });

  it('uses staleTime of 2 minutes (120_000 ms)', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: DEPOT_HEALTH_SCORES_DATA,
      error: null,
    });

    const { wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: HEALTH_QUERY_KEYS.depots(),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(2 * 60 * 1000);
  });

  it('returns empty array when no depots are configured', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: [],
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── Notification trigger: useFleetHealthScore ─────────────────────────────────

describe('useFleetHealthScore — notification triggers', () => {
  /** Helper: sets up mocks for a fleet score below 70 (score = 50) */
  function setupLowFleetScore() {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: {
        totalAssets: 100,
        activeAssets: 50,
        inMaintenance: 25,
        outOfService: 25,
        trailerCount: 70,
        dollyCount: 30,
      },
      error: null,
    });
    // 50 outstanding → scanCompliance = 50
    mockGetOutstandingAssets.mockResolvedValue({
      success: true,
      data: Array(50).fill({
        id: 'x',
        assetNumber: 'X',
        category: 'trailer',
        status: 'serviced',
        lastScanDate: null,
        daysSinceLastScan: null,
        lastLocation: null,
      }),
      error: null,
    });
    // hazardClearance = 50
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 50, error: null });
    // maintenanceCurrency = 50
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 10, scheduled: 5, completed: 0, cancelled: 0, overdue: 5 },
      error: null,
    });
  }

  /** Helper: sets up mocks for a fleet score above 70 (score = 87) */
  function setupHighFleetScore() {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: {
        totalAssets: 100,
        activeAssets: 80,
        inMaintenance: 10,
        outOfService: 10,
        trailerCount: 70,
        dollyCount: 30,
      },
      error: null,
    });
    mockGetOutstandingAssets.mockResolvedValue({
      success: true,
      data: Array(2).fill({
        id: 'x',
        assetNumber: 'X',
        category: 'trailer',
        status: 'serviced',
        lastScanDate: null,
        daysSinceLastScan: null,
        lastLocation: null,
      }),
      error: null,
    });
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 80, error: null });
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 50, scheduled: 30, completed: 15, cancelled: 5, overdue: 10 },
      error: null,
    });
  }

  it('calls createNotification when fleet score drops below 70', async () => {
    setupLowFleetScore();
    // No existing notifications today
    mockGetNotifications.mockResolvedValue({ success: true, data: [], error: null });
    mockCreateNotification.mockResolvedValue({
      success: true,
      data: { id: 'notif-1' },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Wait for the async effect to fire
    await waitFor(() => expect(mockCreateNotification).toHaveBeenCalled());

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-test-123',
      type: 'health_score',
      title: 'Fleet Health At Risk',
      body: 'Fleet health score has dropped to 50%',
      resourceType: 'fleet',
    });
  });

  it('does NOT call createNotification when fleet score is exactly 70', async () => {
    mockGetFleetStatistics.mockResolvedValue({
      success: true,
      data: {
        totalAssets: 100,
        activeAssets: 80,
        inMaintenance: 10,
        outOfService: 10,
        trailerCount: 70,
        dollyCount: 30,
      },
      error: null,
    });
    // 0 outstanding → scanCompliance = 100
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    // hazardClearance = 50
    mockGetHazardClearanceRate.mockResolvedValue({ success: true, data: 50, error: null });
    // 5 overdue out of 10 → maintenanceCurrency = 50
    mockGetMaintenanceStats.mockResolvedValue({
      success: true,
      data: { total: 10, scheduled: 5, completed: 0, cancelled: 0, overdue: 5 },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // score = round(100 * 0.4 + 50 * 0.4 + 50 * 0.2) = 70 → no notification
    expect(result.current.data?.overallScore).toBe(70);

    // Give async effects time to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does NOT call createNotification when fleet score is above 70', async () => {
    setupHighFleetScore();
    mockGetNotifications.mockResolvedValue({ success: true, data: [], error: null });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.overallScore).toBe(87);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does NOT call createNotification when a same-day fleet notification already exists', async () => {
    setupLowFleetScore();
    const today = new Date().toISOString().slice(0, 10);
    // Simulate an existing same-day health_score notification for fleet
    mockGetNotifications.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'existing-notif',
          userId: 'user-test-123',
          type: 'health_score',
          title: 'Fleet Health At Risk',
          body: 'Fleet health score has dropped to 45%',
          resourceId: null,
          resourceType: 'fleet',
          read: false,
          createdAt: `${today}T08:00:00Z`,
        },
      ],
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFleetHealthScore(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Wait for async effect to run
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

// ── Notification trigger: useDepotHealthScores ────────────────────────────────

describe('useDepotHealthScores — notification triggers', () => {
  const today = new Date().toISOString().slice(0, 10);

  const LOW_DEPOT = {
    depotId: 'depot-low',
    depotName: 'Depot Low',
    scanCompliance: 50,
    hazardClearance: 50,
    maintenanceCurrency: 50,
    overallScore: 50,
  };

  const HIGH_DEPOT = {
    depotId: 'depot-high',
    depotName: 'Depot High',
    scanCompliance: 95,
    hazardClearance: 90,
    maintenanceCurrency: 100,
    overallScore: 93,
  };

  const LOW_DEPOT_2 = {
    depotId: 'depot-low-2',
    depotName: 'Depot Low 2',
    scanCompliance: 40,
    hazardClearance: 40,
    maintenanceCurrency: 40,
    overallScore: 40,
  };

  it('calls createNotification for a depot with score below 70', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: [LOW_DEPOT],
      error: null,
    });
    mockGetNotifications.mockResolvedValue({ success: true, data: [], error: null });
    mockCreateNotification.mockResolvedValue({
      success: true,
      data: { id: 'notif-depot-1' },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(mockCreateNotification).toHaveBeenCalled());

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-test-123',
      type: 'health_score',
      title: 'Depot Health At Risk: Depot Low',
      body: 'Depot Low health score has dropped to 50%',
      resourceId: 'depot-low',
      resourceType: 'depot',
    });
  });

  it('does NOT call createNotification for a depot with score >= 70', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: [HIGH_DEPOT],
      error: null,
    });
    mockGetNotifications.mockResolvedValue({ success: true, data: [], error: null });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('creates separate notifications for each depot below 70', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: [LOW_DEPOT, HIGH_DEPOT, LOW_DEPOT_2],
      error: null,
    });
    mockGetNotifications.mockResolvedValue({ success: true, data: [], error: null });
    mockCreateNotification.mockResolvedValue({
      success: true,
      data: { id: 'notif-x' },
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Wait for both notifications to be created
    await waitFor(() => expect(mockCreateNotification).toHaveBeenCalledTimes(2));

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'depot-low', resourceType: 'depot' })
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'depot-low-2', resourceType: 'depot' })
    );
    // High depot should NOT trigger notification
    expect(mockCreateNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'depot-high' })
    );
  });

  it('does NOT call createNotification for depot when same-day notification exists', async () => {
    mockGetDepotHealthScores.mockResolvedValue({
      success: true,
      data: [LOW_DEPOT],
      error: null,
    });
    // Existing same-day notification for this depot
    mockGetNotifications.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'existing-depot-notif',
          userId: 'user-test-123',
          type: 'health_score',
          title: 'Depot Health At Risk: Depot Low',
          body: 'Depot Low health score has dropped to 55%',
          resourceId: 'depot-low',
          resourceType: 'depot',
          read: false,
          createdAt: `${today}T09:00:00Z`,
        },
      ],
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDepotHealthScores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
