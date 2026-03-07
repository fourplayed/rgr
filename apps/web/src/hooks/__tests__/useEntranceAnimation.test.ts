/**
 * Tests for useEntranceAnimation hook
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEntranceAnimation } from '../useEntranceAnimation';

describe('useEntranceAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Mock matchMedia for the hook
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with preloading state', () => {
    const { result } = renderHook(() => useEntranceAnimation(false));

    expect(result.current.isPreloading).toBe(true);
    expect(result.current.showDashboard).toBe(false);
    expect(result.current.navVisible).toBe(false);
  });

  it('should animate entrance when trigger becomes true', async () => {
    const { result, rerender } = renderHook(({ trigger }) => useEntranceAnimation(trigger), {
      initialProps: { trigger: false },
    });

    // Initially preloading
    expect(result.current.isPreloading).toBe(true);

    // Trigger animation
    act(() => {
      rerender({ trigger: true });
    });

    // Advance through all timers at once (nested timers need total time)
    act(() => {
      vi.advanceTimersByTime(300 + 100 + 300);
    });

    expect(result.current.isPreloading).toBe(false);
    expect(result.current.showDashboard).toBe(true);
    expect(result.current.navVisible).toBe(true);
  });

  it('should respect custom timing options', () => {
    const { result, rerender } = renderHook(
      ({ trigger }) =>
        useEntranceAnimation(trigger, {
          preloadDelay: 100,
          entranceDelay: 50,
          navDelay: 150,
        }),
      { initialProps: { trigger: false } }
    );

    act(() => {
      rerender({ trigger: true });
    });

    // Advance through all custom timers at once
    act(() => {
      vi.advanceTimersByTime(100 + 50 + 150);
    });

    expect(result.current.isPreloading).toBe(false);
    expect(result.current.showDashboard).toBe(true);
    expect(result.current.navVisible).toBe(true);
  });

  it('should trigger fallback after maxLoadWait', () => {
    const { result } = renderHook(() => useEntranceAnimation(false, { maxLoadWait: 1000 }));

    // Initially preloading
    expect(result.current.isPreloading).toBe(true);

    // Wait for fallback timeout (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isPreloading).toBe(false);

    // Wait for nav delay (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.navVisible).toBe(true);
  });

  it('should skip animation when prefers-reduced-motion is enabled', () => {
    // Mock prefers-reduced-motion
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.stubGlobal('matchMedia', matchMediaMock);

    const { result, rerender } = renderHook(({ trigger }) => useEntranceAnimation(trigger), {
      initialProps: { trigger: false },
    });

    // Trigger animation
    act(() => {
      rerender({ trigger: true });
    });

    // Should show immediately without waiting for timers
    expect(result.current.isPreloading).toBe(false);
    expect(result.current.showDashboard).toBe(true);
    expect(result.current.navVisible).toBe(true);

    vi.unstubAllGlobals();
  });

  it('should clean up timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(({ trigger }) => useEntranceAnimation(trigger), {
      initialProps: { trigger: false },
    });

    // Trigger animation to create timers
    rerender({ trigger: true });

    // Unmount should clear all timers
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should not animate twice if already animated', async () => {
    const { result, rerender } = renderHook(({ trigger }) => useEntranceAnimation(trigger), {
      initialProps: { trigger: false },
    });

    // First animation
    act(() => {
      rerender({ trigger: true });
    });

    await act(async () => {
      vi.advanceTimersByTime(300 + 100 + 300); // Complete animation
      await Promise.resolve();
    });

    expect(result.current.navVisible).toBe(true);

    // Reset trigger
    act(() => {
      rerender({ trigger: false });
      rerender({ trigger: true });
    });

    // Should not re-animate (isPreloading is already false)
    const currentState = { ...result.current };
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current).toEqual(currentState);
  });

  it('should handle rapid trigger changes gracefully', () => {
    const { result, rerender } = renderHook(({ trigger }) => useEntranceAnimation(trigger), {
      initialProps: { trigger: false },
    });

    // Rapidly toggle trigger
    act(() => {
      rerender({ trigger: true });
      rerender({ trigger: false });
      rerender({ trigger: true });
      rerender({ trigger: false });
      rerender({ trigger: true });
    });

    // Should eventually complete animation
    act(() => {
      vi.advanceTimersByTime(300 + 100 + 300);
    });

    expect(result.current.isPreloading).toBe(false);
  });
});
