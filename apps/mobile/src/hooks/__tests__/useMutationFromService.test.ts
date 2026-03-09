import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMutationFromService } from '../useMutationFromService';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

describe('useMutationFromService', () => {
  it('unwraps a successful ServiceResult', async () => {
    const { wrapper } = createWrapper();
    const serviceFn = jest.fn().mockResolvedValue({ success: true, data: { id: '1' } });

    const { result } = renderHook(
      () => useMutationFromService({ serviceFn }),
      { wrapper },
    );

    result.current.mutate('input');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: '1' });
  });

  it('throws on failed ServiceResult', async () => {
    const { wrapper } = createWrapper();
    const serviceFn = jest.fn().mockResolvedValue({ success: false, error: 'boom' });

    const { result } = renderHook(
      () => useMutationFromService({ serviceFn }),
      { wrapper },
    );

    result.current.mutate('input');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });

  it('calls invalidateQueries for each static key', async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const serviceFn = jest.fn().mockResolvedValue({ success: true, data: 'ok' });

    const { result } = renderHook(
      () =>
        useMutationFromService({
          serviceFn,
          invalidates: [['assets', 'list'], ['scans', 'recent']],
        }),
      { wrapper },
    );

    result.current.mutate('input');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['assets', 'list'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['scans', 'recent'] });
  });

  it('calls invalidateQueries for computed keys from function', async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const serviceFn = jest
      .fn()
      .mockResolvedValue({ success: true, data: { assetId: 'a1' } });

    const { result } = renderHook(
      () =>
        useMutationFromService({
          serviceFn,
          invalidates: (data: { assetId: string }) => [
            ['assets', 'detail', data.assetId],
            ['defects', 'list'],
          ],
        }),
      { wrapper },
    );

    result.current.mutate('input');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['assets', 'detail', 'a1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['defects', 'list'] });
  });

  it('calls custom onSuccess after invalidation', async () => {
    const { wrapper } = createWrapper();
    const serviceFn = jest
      .fn()
      .mockResolvedValue({ success: true, data: { id: '42' } });
    const onSuccess = jest.fn();

    const { result } = renderHook(
      () =>
        useMutationFromService({
          serviceFn,
          invalidates: [['some', 'key']],
          onSuccess,
        }),
      { wrapper },
    );

    result.current.mutate('input');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalledWith({ id: '42' }, 'input');
  });
});
