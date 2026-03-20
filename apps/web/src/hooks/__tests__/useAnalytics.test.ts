/**
 * useAnalytics Hook Tests
 *
 * TDD tests for the analytics React Query hooks.
 * Covers: successful data fetch, error state, staleTime, query key structure.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock @rgr/shared ──────────────────────────────────────────────────────────

const mockGetScanFrequency = vi.fn();
const mockGetAssetUtilization = vi.fn();
const mockGetHazardTrends = vi.fn();
const mockGetTimeBetweenScans = vi.fn();
const mockGetOutstandingAnalyticsAssets = vi.fn();

vi.mock('@rgr/shared', () => ({
  getScanFrequency: (...args: unknown[]) => mockGetScanFrequency(...args),
  getAssetUtilization: (...args: unknown[]) => mockGetAssetUtilization(...args),
  getHazardTrends: (...args: unknown[]) => mockGetHazardTrends(...args),
  getTimeBetweenScans: (...args: unknown[]) => mockGetTimeBetweenScans(...args),
  getOutstandingAnalyticsAssets: (...args: unknown[]) => mockGetOutstandingAnalyticsAssets(...args),
  queryFromService: (fn: () => Promise<{ success: boolean; data: unknown; error: string }>) => {
    return async () => {
      const result = await fn();
      if (!result.success) {
        throw new Error(result.error ?? 'Service error');
      }
      return result.data;
    };
  },
}));

// ── Test wrapper with fresh QueryClient ───────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // don't retry on error in tests
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
  useScanFrequency,
  useAssetUtilization,
  useHazardTrends,
  useTimeBetweenScans,
  useOutstandingAnalyticsAssets,
  ANALYTICS_QUERY_KEYS,
} from '../useAnalytics';

// ── Sample data ───────────────────────────────────────────────────────────────

const SCAN_FREQUENCY_DATA = [
  { date: '2026-03-01', count: 5 },
  { date: '2026-03-02', count: 8 },
];

const ASSET_UTILIZATION_DATA = {
  active: 10,
  idle: 3,
  maintenance: 2,
  retired: 0,
  total: 15,
};

const HAZARD_TRENDS_DATA = [{ date: '2026-03-01', critical: 1, high: 2, medium: 3, low: 4 }];

const TIME_BETWEEN_SCANS_DATA = [
  { bucketDays: 0, count: 5 },
  { bucketDays: 7, count: 3 },
];

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
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useScanFrequency ──────────────────────────────────────────────────────────

describe('useScanFrequency', () => {
  it('returns data on successful fetch', async () => {
    mockGetScanFrequency.mockResolvedValue({
      success: true,
      data: SCAN_FREQUENCY_DATA,
      error: null,
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useScanFrequency('30d'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SCAN_FREQUENCY_DATA);
    expect(mockGetScanFrequency).toHaveBeenCalledWith('30d');
  });

  it('enters error state when service returns failure', async () => {
    mockGetScanFrequency.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch scan frequency: connection refused',
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useScanFrequency('7d'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Failed to fetch scan frequency');
  });

  it('uses correct query key including timeRange', () => {
    expect(ANALYTICS_QUERY_KEYS.scanFrequency('30d')).toEqual([
      'analytics',
      'scanFrequency',
      '30d',
    ]);
    expect(ANALYTICS_QUERY_KEYS.scanFrequency('7d')).toEqual(['analytics', 'scanFrequency', '7d']);
  });

  it('uses staleTime of 5 minutes (300_000 ms)', async () => {
    mockGetScanFrequency.mockResolvedValue({
      success: true,
      data: SCAN_FREQUENCY_DATA,
      error: null,
    });
    const { wrapper, queryClient } = makeWrapper();

    const { result } = renderHook(() => useScanFrequency('30d'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: ANALYTICS_QUERY_KEYS.scanFrequency('30d'),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(300_000);
  });

  it('refetches when timeRange changes', async () => {
    mockGetScanFrequency.mockResolvedValue({
      success: true,
      data: SCAN_FREQUENCY_DATA,
      error: null,
    });
    const { wrapper } = makeWrapper();

    const { result, rerender } = renderHook(
      ({ range }: { range: '7d' | '30d' | '90d' | '1y' }) => useScanFrequency(range),
      { wrapper, initialProps: { range: '7d' as '7d' | '30d' | '90d' | '1y' } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetScanFrequency).toHaveBeenCalledWith('7d');

    rerender({ range: '30d' });
    await waitFor(() => expect(mockGetScanFrequency).toHaveBeenCalledWith('30d'));
  });
});

// ── useAssetUtilization ───────────────────────────────────────────────────────

describe('useAssetUtilization', () => {
  it('returns data on successful fetch', async () => {
    mockGetAssetUtilization.mockResolvedValue({
      success: true,
      data: ASSET_UTILIZATION_DATA,
      error: null,
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useAssetUtilization(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ASSET_UTILIZATION_DATA);
  });

  it('enters error state when service returns failure', async () => {
    mockGetAssetUtilization.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch asset utilization: permission denied',
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useAssetUtilization(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to fetch asset utilization');
  });

  it('uses correct static query key', () => {
    expect(ANALYTICS_QUERY_KEYS.assetUtilization()).toEqual(['analytics', 'assetUtilization']);
  });

  it('uses staleTime of 5 minutes', async () => {
    mockGetAssetUtilization.mockResolvedValue({
      success: true,
      data: ASSET_UTILIZATION_DATA,
      error: null,
    });
    const { wrapper, queryClient } = makeWrapper();

    const { result } = renderHook(() => useAssetUtilization(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: ANALYTICS_QUERY_KEYS.assetUtilization(),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(300_000);
  });
});

// ── useHazardTrends ───────────────────────────────────────────────────────────

describe('useHazardTrends', () => {
  it('returns data on successful fetch', async () => {
    mockGetHazardTrends.mockResolvedValue({
      success: true,
      data: HAZARD_TRENDS_DATA,
      error: null,
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useHazardTrends('90d'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(HAZARD_TRENDS_DATA);
    expect(mockGetHazardTrends).toHaveBeenCalledWith('90d');
  });

  it('enters error state when service returns failure', async () => {
    mockGetHazardTrends.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch hazard trends: timeout',
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useHazardTrends('30d'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to fetch hazard trends');
  });

  it('uses correct query key including timeRange', () => {
    expect(ANALYTICS_QUERY_KEYS.hazardTrends('90d')).toEqual(['analytics', 'hazardTrends', '90d']);
  });

  it('uses staleTime of 5 minutes', async () => {
    mockGetHazardTrends.mockResolvedValue({ success: true, data: HAZARD_TRENDS_DATA, error: null });
    const { wrapper, queryClient } = makeWrapper();

    const { result } = renderHook(() => useHazardTrends('30d'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: ANALYTICS_QUERY_KEYS.hazardTrends('30d'),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(300_000);
  });
});

// ── useTimeBetweenScans ───────────────────────────────────────────────────────

describe('useTimeBetweenScans', () => {
  it('returns data on successful fetch', async () => {
    mockGetTimeBetweenScans.mockResolvedValue({
      success: true,
      data: TIME_BETWEEN_SCANS_DATA,
      error: null,
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useTimeBetweenScans('1y'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(TIME_BETWEEN_SCANS_DATA);
    expect(mockGetTimeBetweenScans).toHaveBeenCalledWith('1y');
  });

  it('enters error state when service returns failure', async () => {
    mockGetTimeBetweenScans.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch time between scans: network error',
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useTimeBetweenScans('30d'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to fetch time between scans');
  });

  it('uses correct query key including timeRange', () => {
    expect(ANALYTICS_QUERY_KEYS.timeBetweenScans('1y')).toEqual([
      'analytics',
      'timeBetweenScans',
      '1y',
    ]);
  });

  it('uses staleTime of 5 minutes', async () => {
    mockGetTimeBetweenScans.mockResolvedValue({
      success: true,
      data: TIME_BETWEEN_SCANS_DATA,
      error: null,
    });
    const { wrapper, queryClient } = makeWrapper();

    const { result } = renderHook(() => useTimeBetweenScans('30d'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: ANALYTICS_QUERY_KEYS.timeBetweenScans('30d'),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(300_000);
  });
});

// ── useOutstandingAnalyticsAssets ─────────────────────────────────────────────

describe('useOutstandingAnalyticsAssets', () => {
  it('returns data on successful fetch', async () => {
    mockGetOutstandingAnalyticsAssets.mockResolvedValue({
      success: true,
      data: OUTSTANDING_ASSETS_DATA,
      error: null,
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useOutstandingAnalyticsAssets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(OUTSTANDING_ASSETS_DATA);
  });

  it('enters error state when service returns failure', async () => {
    mockGetOutstandingAnalyticsAssets.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch outstanding assets: insufficient permissions',
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useOutstandingAnalyticsAssets(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to fetch outstanding assets');
  });

  it('uses correct static query key', () => {
    expect(ANALYTICS_QUERY_KEYS.outstandingAssets()).toEqual(['analytics', 'outstandingAssets']);
  });

  it('uses staleTime of 5 minutes', async () => {
    mockGetOutstandingAnalyticsAssets.mockResolvedValue({
      success: true,
      data: OUTSTANDING_ASSETS_DATA,
      error: null,
    });
    const { wrapper, queryClient } = makeWrapper();

    const { result } = renderHook(() => useOutstandingAnalyticsAssets(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: ANALYTICS_QUERY_KEYS.outstandingAssets(),
    });
    expect((cache?.options as { staleTime?: number })?.staleTime).toBe(300_000);
  });
});
