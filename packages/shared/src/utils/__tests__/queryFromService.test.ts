import { queryFromService, queryFromPaginatedService } from '../queryFromService';
import type { ServiceResult } from '../../types';

describe('queryFromService', () => {
  it('returns data on success', async () => {
    const mockService = async (): Promise<ServiceResult<string>> => ({
      success: true,
      data: 'hello',
      error: null,
    });

    const queryFn = queryFromService(mockService);
    const result = await queryFn();
    expect(result).toBe('hello');
  });

  it('throws Error on failure', async () => {
    const mockService = async (): Promise<ServiceResult<string>> => ({
      success: false,
      data: null,
      error: 'something went wrong',
    });

    const queryFn = queryFromService(mockService);
    await expect(queryFn()).rejects.toThrow(Error);
  });

  it('preserves error message', async () => {
    const mockService = async (): Promise<ServiceResult<number>> => ({
      success: false,
      data: null,
      error: 'Asset not found',
    });

    const queryFn = queryFromService(mockService);
    await expect(queryFn()).rejects.toThrow('Asset not found');
  });
});

describe('queryFromPaginatedService', () => {
  it('unwraps paginated data on success', async () => {
    const mockService = async (): Promise<ServiceResult<{ data: string[]; hasMore: boolean }>> => ({
      success: true,
      data: { data: ['a', 'b', 'c'], hasMore: false },
      error: null,
    });

    const queryFn = queryFromPaginatedService(mockService);
    const result = await queryFn();
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('throws ServiceError on failure', async () => {
    const mockService = async (): Promise<ServiceResult<{ data: number[]; hasMore: boolean }>> => ({
      success: false,
      data: null,
      error: 'Network error',
    });

    const queryFn = queryFromPaginatedService(mockService);
    await expect(queryFn()).rejects.toThrow('Network error');
  });

  it('returns empty array when paginated data is empty', async () => {
    const mockService = async (): Promise<ServiceResult<{ data: string[]; hasMore: boolean }>> => ({
      success: true,
      data: { data: [], hasMore: false },
      error: null,
    });

    const queryFn = queryFromPaginatedService(mockService);
    const result = await queryFn();
    expect(result).toEqual([]);
  });
});
