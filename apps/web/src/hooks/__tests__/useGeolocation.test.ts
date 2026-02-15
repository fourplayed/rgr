import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';
import type { LocationData } from '@rgr/shared';

describe('useGeolocation', () => {
  const mockPosition: GeolocationPosition = {
    coords: {
      latitude: -31.9505,
      longitude: 115.8605,
      accuracy: 10,
      altitude: 50,
      altitudeAccuracy: 5,
      heading: 90,
      speed: 15,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null location and no error', () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.location).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should get current location successfully', async () => {
    const { result } = renderHook(() => useGeolocation());

    const mockGetCurrentPosition = vi.fn((success) => {
      success(mockPosition);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    let locationData: LocationData | null = null;

    await act(async () => {
      locationData = await result.current.getCurrentLocation();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(locationData).toEqual({
      latitude: mockPosition.coords.latitude,
      longitude: mockPosition.coords.longitude,
      accuracy: mockPosition.coords.accuracy,
      altitude: mockPosition.coords.altitude,
      altitudeAccuracy: mockPosition.coords.altitudeAccuracy,
      heading: mockPosition.coords.heading,
      speed: mockPosition.coords.speed,
      timestamp: mockPosition.timestamp,
    });
  });

  it('should handle permission denied error', async () => {
    const { result } = renderHook(() => useGeolocation());

    const mockGetCurrentPosition = vi.fn((_, error) => {
      error({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    let locationData: LocationData | null = null;

    await act(async () => {
      locationData = await result.current.getCurrentLocation();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Location permission denied');
    expect(locationData).toBeNull();
  });

  it('should handle location unavailable error', async () => {
    const { result } = renderHook(() => useGeolocation());

    const mockGetCurrentPosition = vi.fn((_, error) => {
      error({ code: 2, message: 'Position unavailable' } as GeolocationPositionError);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.error).toBe('Location unavailable');
  });

  it('should handle timeout error', async () => {
    const { result } = renderHook(() => useGeolocation());

    const mockGetCurrentPosition = vi.fn((_, error) => {
      error({ code: 3, message: 'Timeout' } as GeolocationPositionError);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.error).toBe('Location request timed out');
  });

  it('should handle missing geolocation API', async () => {
    // Temporarily remove geolocation
    const originalGeolocation = navigator.geolocation;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).geolocation;

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.error).toBe('Geolocation not supported');

    // Restore geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('should set loading state during request', async () => {
    const { result } = renderHook(() => useGeolocation());

    let resolvePosition: ((position: GeolocationPosition) => void) | null = null;

    const mockGetCurrentPosition = vi.fn((success) => {
      resolvePosition = success;
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    act(() => {
      result.current.getCurrentLocation();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePosition!(mockPosition);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should use high accuracy and proper timeout options', async () => {
    const { result } = renderHook(() => useGeolocation());

    const mockGetCurrentPosition = vi.fn((success, _, options) => {
      expect(options).toEqual({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      success(mockPosition);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });

  it('should update location state on successful call', async () => {
    const { result } = renderHook(() => useGeolocation());

    const mockGetCurrentPosition = vi.fn((success) => {
      success(mockPosition);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location).toEqual({
      latitude: mockPosition.coords.latitude,
      longitude: mockPosition.coords.longitude,
      accuracy: mockPosition.coords.accuracy,
      altitude: mockPosition.coords.altitude,
      altitudeAccuracy: mockPosition.coords.altitudeAccuracy,
      heading: mockPosition.coords.heading,
      speed: mockPosition.coords.speed,
      timestamp: mockPosition.timestamp,
    });
  });

  it('should clear error on successful request after previous error', async () => {
    const { result } = renderHook(() => useGeolocation());

    // First request fails
    const mockGetCurrentPositionError = vi.fn((_, error) => {
      error({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPositionError;

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.error).toBe('Location permission denied');

    // Second request succeeds
    const mockGetCurrentPositionSuccess = vi.fn((success) => {
      success(mockPosition);
    });

    navigator.geolocation.getCurrentPosition = mockGetCurrentPositionSuccess;

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.location).not.toBeNull();
  });
});
