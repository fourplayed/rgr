/**
 * Tests for useThemeAnimation hook
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useThemeAnimation } from '../useThemeAnimation';

describe('useThemeAnimation', () => {
  let setShowDashboardMock: ReturnType<typeof vi.fn>;
  let setNavVisibleMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    setShowDashboardMock = vi.fn();
    setNavVisibleMock = vi.fn();

    // Mock matchMedia for the hook
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
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

  it('should initialize with current theme', () => {
    const { result } = renderHook(() =>
      useThemeAnimation(true, false, setShowDashboardMock, setNavVisibleMock)
    );

    expect(result.current.displayTheme).toBe(true);
  });

  it('should update theme immediately during preloading', () => {
    const { result, rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: true } }
    );

    // Change theme during preloading
    rerender({ isDark: false, isPreloading: true });

    // Should update immediately without animation
    expect(result.current.displayTheme).toBe(false);
    expect(setShowDashboardMock).not.toHaveBeenCalled();
    expect(setNavVisibleMock).not.toHaveBeenCalled();
  });

  it('should animate theme transition when not preloading', () => {
    const { result, rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: false } }
    );

    // Change theme
    act(() => {
      rerender({ isDark: false, isPreloading: false });
    });

    // Should immediately hide dashboard and nav
    expect(setShowDashboardMock).toHaveBeenCalledWith(false);
    expect(setNavVisibleMock).toHaveBeenCalledWith(false);

    // Wait for fade-out duration (400ms)
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.displayTheme).toBe(false);

    // Wait for fade-in delay (500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(setShowDashboardMock).toHaveBeenCalledWith(true);

    // Wait for nav delay (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(setNavVisibleMock).toHaveBeenCalledWith(true);
  });

  it('should respect custom timing options', () => {
    const { result, rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock, {
          fadeOutDuration: 200,
          fadeInDelay: 250,
          navDelay: 150,
        }),
      { initialProps: { isDark: true, isPreloading: false } }
    );

    act(() => {
      rerender({ isDark: false, isPreloading: false });
    });

    // Custom fade-out duration (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.displayTheme).toBe(false);

    // Custom fade-in delay (250ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(setShowDashboardMock).toHaveBeenCalledWith(true);

    // Custom nav delay (150ms)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(setNavVisibleMock).toHaveBeenCalledWith(true);
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

    const { result, rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: false } }
    );

    // Change theme
    act(() => {
      rerender({ isDark: false, isPreloading: false });
    });

    // Should update immediately without animation
    expect(result.current.displayTheme).toBe(false);

    // Should not call visibility callbacks
    expect(setShowDashboardMock).not.toHaveBeenCalled();
    expect(setNavVisibleMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should clean up timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: false } }
    );

    // Trigger theme change to create timers
    rerender({ isDark: false, isPreloading: false });

    // Unmount should clear all timers
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should handle rapid theme toggles gracefully', () => {
    const { result, rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: false } }
    );

    // Rapidly toggle theme
    act(() => {
      rerender({ isDark: false, isPreloading: false });
      vi.advanceTimersByTime(100);
      rerender({ isDark: true, isPreloading: false });
      vi.advanceTimersByTime(100);
      rerender({ isDark: false, isPreloading: false });
    });

    // Should eventually settle on latest theme
    act(() => {
      vi.advanceTimersByTime(400 + 500 + 300);
    });

    expect(result.current.displayTheme).toBe(false);
  });

  it('should not animate theme change during entrance animation', () => {
    const { rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: true } }
    );

    // Clear any calls from initial render
    setShowDashboardMock.mockClear();
    setNavVisibleMock.mockClear();

    // Still preloading, finish entrance animation (same theme)
    act(() => {
      rerender({ isDark: true, isPreloading: false });
    });

    // No callbacks should be called (not a theme change, just preloading finished)
    expect(setShowDashboardMock).not.toHaveBeenCalled();
    expect(setNavVisibleMock).not.toHaveBeenCalled();
  });

  it('should clear previous timers when theme changes mid-animation', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { rerender } = renderHook(
      ({ isDark, isPreloading }) =>
        useThemeAnimation(isDark, isPreloading, setShowDashboardMock, setNavVisibleMock),
      { initialProps: { isDark: true, isPreloading: false } }
    );

    // Start first theme change
    act(() => {
      rerender({ isDark: false, isPreloading: false });
      vi.advanceTimersByTime(200); // Mid-animation
    });

    // Start second theme change (should clear previous timers)
    act(() => {
      rerender({ isDark: true, isPreloading: false });
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
