import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { createWrapper } from './testUtils';
import {
  defectKeys,
  useDefectReportList,
  useCreateDefectReport,
  useUpdateDefectReportStatus,
} from '../useDefectData';
import {
  listDefectReports,
  createDefectReport,
  updateDefectReportStatus,
} from '@rgr/shared';

// ── Mocks ──

jest.mock('@rgr/shared', () => ({
  listDefectReports: jest.fn(),
  getDefectReportById: jest.fn(),
  createDefectReport: jest.fn(),
  updateDefectReportStatus: jest.fn(),
  updateDefectReport: jest.fn(),
  deleteDefectReport: jest.fn(),
  getDefectReportStats: jest.fn(),
  getAssetDefectReports: jest.fn(),
  queryFromService: jest.fn((fn: () => Promise<any>) => fn),
}));

jest.mock('../useAssetData', () => ({
  assetKeys: {
    scanContext: (id: string) => ['assets', 'scanContext', id],
  },
}));

jest.mock('../useRealtimeInvalidation', () => ({
  suppressRealtimeFor: jest.fn(),
}));

jest.mock('../../config/featureFlags', () => ({
  OPTIMISTIC_UPDATES_ENABLED: true,
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn((selector: any) =>
    selector({ user: { fullName: 'Test User' } })
  ),
}));

const mockListDefectReports = listDefectReports as jest.MockedFunction<typeof listDefectReports>;
const mockCreateDefectReport = createDefectReport as jest.MockedFunction<typeof createDefectReport>;
const mockUpdateDefectReportStatus = updateDefectReportStatus as jest.MockedFunction<
  typeof updateDefectReportStatus
>;

// ── Fixtures ──

const defectItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'dr-1',
  assetId: 'asset-1',
  title: 'Cracked windshield',
  description: null,
  status: 'reported' as const,
  maintenanceRecordId: null,
  createdAt: '2026-03-01T00:00:00Z',
  reporterName: 'Test User',
  assetNumber: 'A-001',
  assetCategory: null,
  ...overrides,
});

// ── Tests ──

beforeEach(() => {
  jest.clearAllMocks();
});

// ── defectKeys factory ──

describe('defectKeys', () => {
  it('returns base key from .all', () => {
    expect(defectKeys.all).toEqual(['defects']);
  });

  it('includes filter object in .list()', () => {
    const filters = { status: ['reported' as const] };
    const key = defectKeys.list(filters);
    expect(key).toEqual(['defects', 'list', { status: ['reported'] }]);
  });
});

// ── useDefectReportList ──

describe('useDefectReportList', () => {
  it('returns first page data from the service', async () => {
    const items = [defectItem(), defectItem({ id: 'dr-2' })];
    mockListDefectReports.mockResolvedValue({
      success: true,
      data: { data: items, hasMore: false },
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDefectReportList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.data).toEqual(items);
  });

  it('passes filters to the service call', async () => {
    mockListDefectReports.mockResolvedValue({
      success: true,
      data: { data: [], hasMore: false },
    } as any);

    const filters = { status: ['reported' as const], assetId: 'asset-99' };
    const { wrapper } = createWrapper();
    renderHook(() => useDefectReportList(filters), { wrapper });

    await waitFor(() =>
      expect(mockListDefectReports).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['reported'],
          assetId: 'asset-99',
          limit: 20,
        })
      )
    );
  });

  it('getNextPageParam returns cursor when hasMore is true, undefined otherwise', async () => {
    const item = defectItem();
    // First call: hasMore=true
    mockListDefectReports.mockResolvedValueOnce({
      success: true,
      data: { data: [item], hasMore: true },
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDefectReportList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // hasMore=true — should have a next page param (the cursor)
    expect(result.current.hasNextPage).toBe(true);

    // Fetch next page — hasMore=false
    const item2 = defectItem({ id: 'dr-2', createdAt: '2026-02-28T00:00:00Z' });
    mockListDefectReports.mockResolvedValueOnce({
      success: true,
      data: { data: [item2], hasMore: false },
    } as any);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    // Second page call should have received cursor from first page's last item
    expect(mockListDefectReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { createdAt: item.createdAt, id: item.id },
      })
    );

    // No more pages after second fetch
    expect(result.current.hasNextPage).toBe(false);
  });
});

// ── useCreateDefectReport ──

describe('useCreateDefectReport', () => {
  it('calls createDefectReport and returns unwrapped data', async () => {
    const created = {
      id: 'dr-new',
      assetId: 'asset-1',
      title: 'Flat tyre',
      status: 'reported',
      createdAt: '2026-03-13T00:00:00Z',
      updatedAt: '2026-03-13T00:00:00Z',
    };
    mockCreateDefectReport.mockResolvedValue({
      success: true,
      data: created,
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateDefectReport(), { wrapper });

    const input = { assetId: 'asset-1', title: 'Flat tyre' };
    result.current.mutate(input as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(created);
    expect(mockCreateDefectReport).toHaveBeenCalledWith(input);
  });

  it('invalidates defect lists, stats, asset defects, and scanContext', async () => {
    const created = { id: 'dr-new', assetId: 'asset-1' };
    mockCreateDefectReport.mockResolvedValue({
      success: true,
      data: created,
    } as any);

    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDefectReport(), { wrapper });

    result.current.mutate({ assetId: 'asset-1', title: 'Flat tyre' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // defectKeys.lists()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'list'] });
    // defectKeys.stats()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'stats'] });
    // defectKeys.asset(data.assetId)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'list', 'asset', 'asset-1'] });
    // assetKeys.scanContext(data.assetId)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['assets', 'scanContext', 'asset-1'] });
  });
});

// ── useUpdateDefectReportStatus ──

describe('useUpdateDefectReportStatus', () => {
  it('calls updateDefectReportStatus with id, status, and extras', async () => {
    const updated = { id: 'dr-1', status: 'task_created', assetId: 'asset-1' };
    mockUpdateDefectReportStatus.mockResolvedValue({
      success: true,
      data: updated,
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateDefectReportStatus(), { wrapper });

    const input = {
      id: 'dr-1',
      status: 'task_created' as const,
      extras: { maintenanceRecordId: 'mr-1' },
    };
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateDefectReportStatus).toHaveBeenCalledWith(
      'dr-1',
      'task_created',
      { maintenanceRecordId: 'mr-1' }
    );
  });

  it('invalidates detail, lists, and stats on success', async () => {
    const updated = { id: 'dr-1', status: 'resolved' };
    mockUpdateDefectReportStatus.mockResolvedValue({
      success: true,
      data: updated,
    } as any);

    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateDefectReportStatus(), { wrapper });

    result.current.mutate({ id: 'dr-1', status: 'resolved' as const });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // defectKeys.detail(data.id)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'detail', 'dr-1'] });
    // defectKeys.lists()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'list'] });
    // defectKeys.stats()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'stats'] });
  });
});

// ── Optimistic updates ──

describe('optimistic: createDefectReport', () => {
  // gcTime must be > 0 so pre-seeded cache survives until async onMutate reads it
  const createOptimisticClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 60_000 },
        mutations: { retry: false },
      },
    });

  const seedListCache = (queryClient: any) => {
    queryClient.setQueryData(defectKeys.list({}), {
      pages: [{ data: [defectItem()], hasMore: false }],
      pageParams: [undefined],
    });
  };

  it('inserts placeholder into list cache before server response', async () => {
    const { wrapper, queryClient } = createWrapper(createOptimisticClient());
    seedListCache(queryClient);

    // Mutation hangs so we can inspect cache mid-flight
    let resolveMutation!: (value: any) => void;
    mockCreateDefectReport.mockImplementation(
      () => new Promise((resolve) => { resolveMutation = resolve; })
    );

    const { result } = renderHook(() => useCreateDefectReport(), { wrapper });

    result.current.mutate({ assetId: 'asset-1', title: 'New defect' } as any);

    // onMutate fires before mutationFn — placeholder should be prepended
    await waitFor(() => {
      const cache = queryClient.getQueryData(defectKeys.list({})) as any;
      expect(cache?.pages[0]?.data).toHaveLength(2);
    });

    const cache = queryClient.getQueryData(defectKeys.list({})) as any;
    expect(cache.pages[0].data[0].title).toBe('New defect');
    expect(cache.pages[0].data[0].status).toBe('reported');
    expect(cache.pages[0].data[1].id).toBe('dr-1');

    // Cleanup: resolve and let mutation settle
    resolveMutation({ success: true, data: { id: 'dr-new', assetId: 'asset-1' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back cache on mutation error', async () => {
    const { wrapper, queryClient } = createWrapper(createOptimisticClient());
    seedListCache(queryClient);

    mockCreateDefectReport.mockResolvedValue({
      success: false,
      data: null,
      error: 'Network error',
    } as any);

    const { result } = renderHook(() => useCreateDefectReport(), { wrapper });

    result.current.mutate({ assetId: 'asset-1', title: 'Will fail' } as any);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back to original single item
    const cache = queryClient.getQueryData(defectKeys.list({})) as any;
    expect(cache.pages[0].data).toHaveLength(1);
    expect(cache.pages[0].data[0].id).toBe('dr-1');
  });

  it('cancels in-flight queries during onMutate', async () => {
    const { wrapper, queryClient } = createWrapper(createOptimisticClient());
    seedListCache(queryClient);

    const cancelSpy = jest.spyOn(queryClient, 'cancelQueries');
    mockCreateDefectReport.mockResolvedValue({
      success: true,
      data: { id: 'dr-new', assetId: 'asset-1' },
    } as any);

    const { result } = renderHook(() => useCreateDefectReport(), { wrapper });

    result.current.mutate({ assetId: 'asset-1', title: 'New defect' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: defectKeys.list({}),
    });
  });
});
