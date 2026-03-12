import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from './testUtils';

jest.mock('@rgr/shared', () => ({
  listMaintenance: jest.fn(),
  getMaintenanceById: jest.fn(),
  createMaintenance: jest.fn(),
  updateMaintenanceStatus: jest.fn(),
  updateMaintenance: jest.fn(),
  cancelMaintenanceTask: jest.fn(),
  getMaintenanceStats: jest.fn(),
  queryFromService: jest.fn((fn: () => Promise<any>) => fn),
}));

jest.mock('../useAssetData', () => ({
  assetKeys: {
    maintenance: (id: string) => ['assets', 'detail', id, 'maintenance'],
    scanContext: (id: string) => ['assets', 'scanContext', id],
  },
}));

jest.mock('../useDefectData', () => ({
  defectKeys: { lists: () => ['defects', 'list'] },
}));

import {
  listMaintenance,
  createMaintenance,
  updateMaintenanceStatus,
} from '@rgr/shared';
import {
  maintenanceKeys,
  useMaintenanceList,
  useCreateMaintenance,
  useUpdateMaintenanceStatus,
} from '../useMaintenanceData';

const mockListMaintenance = listMaintenance as jest.MockedFunction<typeof listMaintenance>;
const mockCreateMaintenance = createMaintenance as jest.MockedFunction<typeof createMaintenance>;
const mockUpdateMaintenanceStatus = updateMaintenanceStatus as jest.MockedFunction<
  typeof updateMaintenanceStatus
>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// maintenanceKeys factory
// ---------------------------------------------------------------------------
describe('maintenanceKeys', () => {
  it('returns ["maintenance"] for .all', () => {
    expect(maintenanceKeys.all).toEqual(['maintenance']);
  });

  it('includes filter object in .list()', () => {
    const filters = { status: ['scheduled'] };
    expect(maintenanceKeys.list(filters as any)).toEqual([
      'maintenance',
      'list',
      { status: ['scheduled'] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// useMaintenanceList
// ---------------------------------------------------------------------------
describe('useMaintenanceList', () => {
  it('returns first page data on success', async () => {
    const items = [
      { id: 'm1', createdAt: '2026-01-01T00:00:00Z', title: 'Task 1' },
      { id: 'm2', createdAt: '2026-01-02T00:00:00Z', title: 'Task 2' },
    ];
    mockListMaintenance.mockResolvedValue({
      success: true,
      data: { data: items, hasMore: false },
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMaintenanceList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.data).toEqual(items);
  });

  it('passes filters to the service call', async () => {
    mockListMaintenance.mockResolvedValue({
      success: true,
      data: { data: [], hasMore: false },
    } as any);

    const filters = { status: ['scheduled'] as any, priority: ['high'] as any, assetId: 'a1' };
    const { wrapper } = createWrapper();
    renderHook(() => useMaintenanceList(filters), { wrapper });

    await waitFor(() => expect(mockListMaintenance).toHaveBeenCalled());

    expect(mockListMaintenance).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['scheduled'],
        priority: ['high'],
        assetId: 'a1',
        limit: 20,
      })
    );
  });

  it('getNextPageParam returns cursor when hasMore=true, undefined when false', async () => {
    const items = [
      { id: 'm1', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'm2', createdAt: '2026-01-02T00:00:00Z' },
    ];

    // First call: has more pages
    mockListMaintenance.mockResolvedValueOnce({
      success: true,
      data: { data: items, hasMore: true },
    } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMaintenanceList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    // Second call: no more pages
    mockListMaintenance.mockResolvedValueOnce({
      success: true,
      data: { data: [{ id: 'm3', createdAt: '2026-01-03T00:00:00Z' }], hasMore: false },
    } as any);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);

    // Verify second call used cursor from last item of first page
    expect(mockListMaintenance).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { createdAt: '2026-01-02T00:00:00Z', id: 'm2' },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// useCreateMaintenance
// ---------------------------------------------------------------------------
describe('useCreateMaintenance', () => {
  it('calls createMaintenance with input and returns data', async () => {
    const created = { id: 'm-new', assetId: 'a1', title: 'New task' };
    mockCreateMaintenance.mockResolvedValue({ success: true, data: created } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateMaintenance(), { wrapper });

    result.current.mutate({ assetId: 'a1', title: 'New task' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(created);
    expect(mockCreateMaintenance).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: 'a1', title: 'New task' })
    );
  });

  it('invalidates maintenance lists, stats, and asset-specific keys', async () => {
    const created = { id: 'm-new', assetId: 'a1', title: 'New task' };
    mockCreateMaintenance.mockResolvedValue({ success: true, data: created } as any);

    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateMaintenance(), { wrapper });

    result.current.mutate({ assetId: 'a1', title: 'New task' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ queryKey: ['maintenance', 'list'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['maintenance', 'stats'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['assets', 'detail', 'a1', 'maintenance'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['assets', 'scanContext', 'a1'] });
  });
});

// ---------------------------------------------------------------------------
// useUpdateMaintenanceStatus
// ---------------------------------------------------------------------------
describe('useUpdateMaintenanceStatus', () => {
  it('calls updateMaintenanceStatus with id, status, and extras', async () => {
    const updated = { id: 'm1', status: 'completed' };
    mockUpdateMaintenanceStatus.mockResolvedValue({ success: true, data: updated } as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateMaintenanceStatus(), { wrapper });

    result.current.mutate({
      id: 'm1',
      status: 'completed' as any,
      extras: { completedBy: 'user-1' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updated);
    expect(mockUpdateMaintenanceStatus).toHaveBeenCalledWith('m1', 'completed', {
      completedBy: 'user-1',
    });
  });

  it('invalidates detail, lists, and stats', async () => {
    const updated = { id: 'm1', status: 'completed' };
    mockUpdateMaintenanceStatus.mockResolvedValue({ success: true, data: updated } as any);

    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateMaintenanceStatus(), { wrapper });

    result.current.mutate({ id: 'm1', status: 'completed' as any });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ queryKey: ['maintenance', 'detail', 'm1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['maintenance', 'list'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['maintenance', 'stats'] });
  });
});

// ---------------------------------------------------------------------------
// Optimistic update scaffolds (Phase 3)
// ---------------------------------------------------------------------------
describe('optimistic: createMaintenance', () => {
  it.todo('inserts placeholder into list cache before server response');
  it.todo('rolls back cache on mutation error');
  it.todo('cancels in-flight queries during onMutate');
});

describe('optimistic: updateMaintenanceStatus', () => {
  it.todo('updates status in detail + list cache before server response');
  it.todo('rolls back both caches on error');
});
