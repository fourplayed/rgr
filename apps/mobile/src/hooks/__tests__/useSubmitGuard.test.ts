import { renderHook } from '@testing-library/react-native';
import { act } from 'react';
import { useSubmitGuard } from '../useSubmitGuard';

describe('useSubmitGuard', () => {
  it('first call executes the async function', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitGuard());

    await act(async () => {
      await result.current(fn);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('second concurrent call is ignored', async () => {
    let resolve: () => void;
    const slowFn = jest.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        })
    );
    const { result } = renderHook(() => useSubmitGuard());

    let firstDone = false;
    await act(async () => {
      const p1 = result.current(slowFn).then(() => {
        firstDone = true;
      });
      // Second call while first is still pending
      await result.current(slowFn);
      // Resolve the first
      resolve!();
      await p1;
    });

    expect(slowFn).toHaveBeenCalledTimes(1);
    expect(firstDone).toBe(true);
  });

  it('after completion, new call is allowed', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitGuard());

    await act(async () => {
      await result.current(fn);
    });
    await act(async () => {
      await result.current(fn);
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('if fn throws, guard still resets', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('fail'));
    const succeeding = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitGuard());

    await act(async () => {
      try {
        await result.current(failing);
      } catch {
        // expected
      }
    });

    await act(async () => {
      await result.current(succeeding);
    });

    expect(failing).toHaveBeenCalledTimes(1);
    expect(succeeding).toHaveBeenCalledTimes(1);
  });

  it('multiple sequential calls each execute', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitGuard());

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await result.current(fn);
      });
    }

    expect(fn).toHaveBeenCalledTimes(5);
  });
});
