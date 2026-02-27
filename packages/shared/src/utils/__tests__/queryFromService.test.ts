import { queryFromService } from '../queryFromService';
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
