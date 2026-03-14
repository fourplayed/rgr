import { renderHook, waitFor } from '@testing-library/react-native';
import { listAssets, getAssetCountsByStatus, createScanEvent, updateAsset } from '@rgr/shared';
import type { CreateScanEventInput, UpdateAssetInput } from '@rgr/shared';
import {
  assetKeys,
  useInfiniteAssetList,
  useAssetCountsByStatus,
  useCreateScanEvent,
  useUpdateAsset,
} from '../useAssetData';
import { createWrapper } from './testUtils';

jest.mock('@rgr/shared', () => ({
  listAssets: jest.fn(),
  getAssetCountsByStatus: jest.fn(),
  createScanEvent: jest.fn(),
  updateAsset: jest.fn(),
  queryFromService: jest.fn((fn: () => Promise<unknown>) => fn),
}));

const mockListAssets = listAssets as jest.Mock;
const mockGetAssetCountsByStatus = getAssetCountsByStatus as jest.Mock;
const mockCreateScanEvent = createScanEvent as jest.Mock;
const mockUpdateAsset = updateAsset as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// assetKeys factory
// ---------------------------------------------------------------------------
describe('assetKeys', () => {
  it('all returns ["assets"]', () => {
    expect(assetKeys.all).toEqual(['assets']);
  });

  it('list(filters) includes the filters object', () => {
    const filters = { statuses: ['serviced' as const] };
    expect(assetKeys.list(filters)).toEqual(['assets', 'list', { statuses: ['serviced'] }]);
  });

  it('infinite(filters) includes an "infinite" segment', () => {
    const filters = { search: 'truck' };
    const key = assetKeys.infinite(filters);
    expect(key).toContain('infinite');
    expect(key).toEqual(['assets', 'list', 'infinite', { search: 'truck' }]);
  });
});

// ---------------------------------------------------------------------------
// useInfiniteAssetList
// ---------------------------------------------------------------------------
describe('useInfiniteAssetList', () => {
  const fakeAssets = [
    { id: 'a1', assetNumber: 'A001' },
    { id: 'a2', assetNumber: 'A002' },
  ];

  it('returns first page data on success', async () => {
    mockListAssets.mockResolvedValue({
      success: true,
      data: { data: fakeAssets, hasMore: false },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssetList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.data).toEqual(fakeAssets);
    expect(mockListAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 20,
        sortField: 'assetNumber',
        sortDirection: 'asc',
      })
    );
  });

  it('passes filters to service call', async () => {
    mockListAssets.mockResolvedValue({
      success: true,
      data: { data: fakeAssets, hasMore: false },
    });

    const filters = { statuses: ['serviced' as const], search: 'truck' };
    const { wrapper } = createWrapper();
    renderHook(() => useInfiniteAssetList(filters), { wrapper });

    await waitFor(() =>
      expect(mockListAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: ['serviced'],
          search: 'truck',
        })
      )
    );
  });

  it('throws on failed ServiceResult', async () => {
    mockListAssets.mockResolvedValue({ success: false, error: 'Network failure' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssetList(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network failure');
  });

  it('getNextPageParam returns undefined when hasMore is false', async () => {
    mockListAssets.mockResolvedValue({
      success: true,
      data: { data: fakeAssets, hasMore: false },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssetList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useAssetCountsByStatus
// ---------------------------------------------------------------------------
describe('useAssetCountsByStatus', () => {
  it('transforms raw status counts into the expected shape', async () => {
    mockGetAssetCountsByStatus.mockResolvedValue({
      success: true,
      data: [
        { status: 'serviced', count: 10 },
        { status: 'maintenance', count: 5 },
        { status: 'out_of_service', count: 2 },
      ],
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAssetCountsByStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      counts: { serviced: 10, maintenance: 5, out_of_service: 2 },
      total: 17,
      serviced: 10,
      maintenance: 5,
      outOfService: 2,
    });
  });

  it('handles empty result set', async () => {
    mockGetAssetCountsByStatus.mockResolvedValue({
      success: true,
      data: [],
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAssetCountsByStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      counts: {},
      total: 0,
      serviced: 0,
      maintenance: 0,
      outOfService: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// useCreateScanEvent
// ---------------------------------------------------------------------------
describe('useCreateScanEvent', () => {
  it('calls createScanEvent with input', async () => {
    const scanData = { id: 'se1', assetId: 'a1' };
    mockCreateScanEvent.mockResolvedValue({ success: true, data: scanData });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateScanEvent(), { wrapper });

    const input = { assetId: 'a1', eventType: 'check_in' };
    result.current.mutate(input as unknown as CreateScanEventInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateScanEvent).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(scanData);
  });

  it('invalidates correct query keys after success', async () => {
    mockCreateScanEvent.mockResolvedValue({ success: true, data: { id: 'se1' } });

    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateScanEvent(), { wrapper });

    result.current.mutate({
      assetId: 'a1',
      eventType: 'check_in',
    } as unknown as CreateScanEventInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.scans('a1') });
    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.detail('a1') });
    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.recentScans() });
    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.totalScanCount() });
    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.scanContext('a1') });
  });
});

// ---------------------------------------------------------------------------
// useUpdateAsset
// ---------------------------------------------------------------------------
describe('useUpdateAsset', () => {
  it('calls updateAsset with id and input', async () => {
    const updatedAsset = { id: 'a1', assetNumber: 'A001-updated' };
    mockUpdateAsset.mockResolvedValue({ success: true, data: updatedAsset });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateAsset(), { wrapper });

    const input = {
      id: 'a1',
      input: { assetNumber: 'A001-updated' } as unknown as UpdateAssetInput,
    };
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateAsset).toHaveBeenCalledWith('a1', { assetNumber: 'A001-updated' });
    expect(result.current.data).toEqual(updatedAsset);
  });

  it('invalidates detail and list keys after success', async () => {
    const updatedAsset = { id: 'a1', assetNumber: 'A001-updated' };
    mockUpdateAsset.mockResolvedValue({ success: true, data: updatedAsset });

    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAsset(), { wrapper });

    result.current.mutate({
      id: 'a1',
      input: { assetNumber: 'A001-updated' } as unknown as UpdateAssetInput,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.detail('a1') });
    expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.lists() });
  });
});
