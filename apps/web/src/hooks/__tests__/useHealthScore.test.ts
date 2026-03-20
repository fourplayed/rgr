/**
 * useHealthScore Hook Tests
 *
 * TDD tests for the fleet health score React Query hooks.
 * Covers: successful data fetch, error state, score computation, staleTime, query key structure.
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

vi.mock('@rgr/shared', () => ({
  getFleetStatistics: (...args: unknown[]) => mockGetFleetStatistics(...args),
  getOutstandingAssets: (...args: unknown[]) => mockGetOutstandingAssets(...args),
  getHazardClearanceRate: (...args: unknown[]) => mockGetHazardClearanceRate(...args),
  getMaintenanceStats: (...args: unknown[]) => mockGetMaintenanceStats(...args),
  getDepotHealthScores: (...args: unknown[]) => mockGetDepotHealthScores(...args),
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

import {
  useFleetHealthScore,
  useDepotHealthScores,
  HEALTH_QUERY_KEYS,
} from '../useHealthScore';

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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
    // 50 out of 100 outstanding → scanCompliance = 50
    mockGetOutstandingAssets.mockResolvedValue({
      success: true,
      data: Array(50).fill({ id: 'x', assetNumber: 'X', category: 'trailer', status: 'serviced', lastScanDate: null, daysSinceLastScan: null, lastLocation: null }),
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: FLEET_STATS_DATA, error: null });
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
    expect(cache?.options.staleTime).toBe(2 * 60 * 1000);
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
    expect(cache?.options.staleTime).toBe(2 * 60 * 1000);
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
