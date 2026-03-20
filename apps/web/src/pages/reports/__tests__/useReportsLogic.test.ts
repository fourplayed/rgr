/**
 * useReportsLogic — unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mock analytics hooks ──────────────────────────────────────────────────────
vi.mock('@/hooks/useAnalytics', () => ({
  useScanFrequency: () => ({ data: [], isLoading: false }),
  useAssetUtilization: () => ({ data: undefined, isLoading: false }),
  useHazardTrends: () => ({ data: [], isLoading: false }),
  useTimeBetweenScans: () => ({ data: [], isLoading: false }),
  useOutstandingAnalyticsAssets: () => ({ data: [], isLoading: false }),
}));

import { useReportsLogic } from '../useReportsLogic';
import type { AnalyticsOutstandingAsset } from '@rgr/shared';

// ── Test wrapper ──────────────────────────────────────────────────────────────
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useReportsLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults timeRange to "30d"', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    expect(result.current.timeRange).toBe('30d');
  });

  it('updates timeRange when setTimeRange is called', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setTimeRange('7d');
    });
    expect(result.current.timeRange).toBe('7d');
  });

  it('updates timeRange to 90d', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setTimeRange('90d');
    });
    expect(result.current.timeRange).toBe('90d');
  });

  it('exposes scanFrequency data from hook', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    expect(result.current.scanFrequency).toEqual([]);
    expect(result.current.scanFrequencyLoading).toBe(false);
  });

  it('exposes assetUtilization data from hook', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    expect(result.current.assetUtilization).toBeUndefined();
    expect(result.current.assetUtilizationLoading).toBe(false);
  });

  it('exposes hazardTrends data from hook', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    expect(result.current.hazardTrends).toEqual([]);
    expect(result.current.hazardTrendsLoading).toBe(false);
  });

  it('exposes timeBetweenScans data from hook', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    expect(result.current.timeBetweenScans).toEqual([]);
    expect(result.current.timeBetweenScansLoading).toBe(false);
  });

  it('exposes outstandingAssets data from hook', () => {
    const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });
    expect(result.current.outstandingAssets).toEqual([]);
    expect(result.current.outstandingAssetsLoading).toBe(false);
  });

  describe('handleExportCsv', () => {
    /**
     * Strategy: render the hook BEFORE mocking document.createElement
     * (renderHook itself uses createElement to create the wrapper div).
     * Apply the mock only right before calling handleExportCsv.
     */

    function setupUrlMocks() {
      const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLSpy = vi.fn();
      Object.defineProperty(globalThis, 'URL', {
        value: {
          createObjectURL: createObjectURLSpy,
          revokeObjectURL: revokeObjectURLSpy,
        },
        writable: true,
        configurable: true,
      });
      return { createObjectURLSpy, revokeObjectURLSpy };
    }

    it('triggers a blob download when called with asset data', () => {
      // Render hook FIRST — before any createElement mocking
      const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });

      // Now set up mocks
      const { createObjectURLSpy, revokeObjectURLSpy } = setupUrlMocks();
      const mockAnchor = { href: '', download: '', click: vi.fn() };
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor as unknown as HTMLElement);

      const testAssets: AnalyticsOutstandingAsset[] = [
        {
          id: 'asset-1',
          assetNumber: 'RGR-001',
          category: 'forklift',
          status: 'active',
          lastScanDate: '2026-02-01',
          daysSinceLastScan: 47,
          lastLocation: null,
        },
      ];

      act(() => {
        result.current.handleExportCsv(testAssets);
      });

      createElementSpy.mockRestore();

      expect(createObjectURLSpy).toHaveBeenCalledOnce();
      expect(mockAnchor.click).toHaveBeenCalledOnce();
      expect(mockAnchor.download).toBe('outstanding-assets.csv');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('handles assets with null lastScanDate and daysSinceLastScan', () => {
      const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });

      const { createObjectURLSpy } = setupUrlMocks();
      const mockAnchor = { href: '', download: '', click: vi.fn() };
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor as unknown as HTMLElement);

      const testAssets: AnalyticsOutstandingAsset[] = [
        {
          id: 'asset-2',
          assetNumber: 'RGR-002',
          category: 'crane',
          status: 'idle',
          lastScanDate: null,
          daysSinceLastScan: null,
          lastLocation: null,
        },
      ];

      act(() => {
        result.current.handleExportCsv(testAssets);
      });

      createElementSpy.mockRestore();

      expect(createObjectURLSpy).toHaveBeenCalledOnce();
      expect(mockAnchor.click).toHaveBeenCalledOnce();
    });

    it('creates CSV with correct headers and rows', () => {
      const { result } = renderHook(() => useReportsLogic(), { wrapper: makeWrapper() });

      let capturedCsv: string | null = null;
      // Intercept the Blob constructor to capture CSV text
      const OriginalBlob = globalThis.Blob;
      const BlobSpy = vi.fn().mockImplementation((parts: BlobPart[], options?: BlobPropertyBag) => {
        if (options?.type === 'text/csv' && Array.isArray(parts)) {
          capturedCsv = parts.join('');
        }
        return new OriginalBlob(parts, options);
      });
      Object.defineProperty(globalThis, 'Blob', {
        value: BlobSpy,
        writable: true,
        configurable: true,
      });

      const { createObjectURLSpy } = setupUrlMocks();
      const mockAnchor = { href: '', download: '', click: vi.fn() };
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor as unknown as HTMLElement);

      const testAssets: AnalyticsOutstandingAsset[] = [
        {
          id: 'asset-1',
          assetNumber: 'RGR-001',
          category: 'forklift',
          status: 'active',
          lastScanDate: '2026-02-01',
          daysSinceLastScan: 47,
          lastLocation: null,
        },
      ];

      act(() => {
        result.current.handleExportCsv(testAssets);
      });

      createElementSpy.mockRestore();
      Object.defineProperty(globalThis, 'Blob', {
        value: OriginalBlob,
        writable: true,
        configurable: true,
      });

      expect(createObjectURLSpy).toHaveBeenCalledOnce();
      expect(capturedCsv).not.toBeNull();
      expect(capturedCsv).toContain('Asset Number,Category,Status,Last Scanned,Days Overdue');
      expect(capturedCsv).toContain('RGR-001,forklift,active,2026-02-01,47');
    });
  });
});
