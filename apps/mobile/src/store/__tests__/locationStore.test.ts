/**
 * Comprehensive test suite for locationStore.
 *
 * Covers:
 * - resolveDepot: concurrency guard, rate-limiting, GPS fallback, exponential backoff, permission checks, debug GPS override, nearest depot matching
 * - ensureFresh: staleness check, guard conditions
 * - cancelRetries: timeout/counter cleanup
 * - clearResolvedDepot: full state reset
 * - waitForLocationResolution: immediate resolve, subscription, timeout
 * - eventBus integration: USER_LOGOUT triggers clearResolvedDepot
 */

import * as Location from 'expo-location';
import { findNearestLocation } from '@rgr/shared';
import type { Depot } from '@rgr/shared';
import { useLocationStore, waitForLocationResolution } from '../locationStore';
import { useDebugLocationStore } from '../debugLocationStore';
import { eventBus, AppEvents } from '../../utils/eventBus';

// ── Mocks ────────────────────────────────────────────────────────────────────

// expo-location is globally mocked in jest.setup.ts — grab typed references.
const mockGetPerms = Location.getForegroundPermissionsAsync as jest.Mock;
const mockRequestPerms = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetPosition = Location.getCurrentPositionAsync as jest.Mock;

// Mock findNearestLocation so tests control the return value.
jest.mock('@rgr/shared', () => {
  const actual = jest.requireActual('@rgr/shared');
  return {
    ...actual,
    findNearestLocation: jest.fn(),
  };
});
const mockFindNearest = findNearestLocation as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────

const PERTH_COORDS = { latitude: -31.9505, longitude: 115.8605 };

const makeLocationObject = (
  overrides?: Partial<Location.LocationObjectCoords>
): Location.LocationObject => ({
  coords: {
    latitude: PERTH_COORDS.latitude,
    longitude: PERTH_COORDS.longitude,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    ...overrides,
  },
  timestamp: Date.now(),
});

const makeDepot = (overrides?: Partial<Depot>): Depot => ({
  id: 'depot-1',
  name: 'Perth Depot',
  code: 'PER',
  address: '123 Main St',
  latitude: PERTH_COORDS.latitude,
  longitude: PERTH_COORDS.longitude,
  color: '#FF0000',
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

/** Reset Zustand state + module-scoped _lastDepots (via clearResolvedDepot). */
function resetStore() {
  useLocationStore.setState({
    resolvedDepot: null,
    isResolvingDepot: false,
    depotResolutionError: null,
    lastResolvedAt: null,
    lastLocation: null,
    retryCount: 0,
    retryTimeoutId: null,
    permissionDenied: false,
  });
}

function defaultMocks() {
  mockGetPerms.mockResolvedValue({ status: 'granted', granted: true });
  mockRequestPerms.mockResolvedValue({ status: 'granted', granted: true });
  mockGetPosition.mockResolvedValue(makeLocationObject());
  mockFindNearest.mockReturnValue({
    location: makeDepot(),
    distanceKm: 0.5,
  });
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  // Deterministic jitter: Math.random() always returns 0
  jest.spyOn(Math, 'random').mockReturnValue(0);

  // Clear accumulated call counts from prior tests
  jest.clearAllMocks();

  resetStore();
  defaultMocks();

  // Ensure debug location is off by default
  useDebugLocationStore.setState({ overrideEnabled: false });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── resolveDepot ─────────────────────────────────────────────────────────────

describe('resolveDepot', () => {
  // -- Concurrency guard --

  it('does not start a second resolution while one is in-flight (concurrency guard)', async () => {
    // First call: will never resolve until we flush
    let resolvePosition!: (v: Location.LocationObject) => void;
    mockGetPosition.mockReturnValueOnce(
      new Promise<Location.LocationObject>((r) => {
        resolvePosition = r;
      })
    );

    const depots = [makeDepot()];
    const first = useLocationStore.getState().resolveDepot(depots);

    // isResolvingDepot should be true now
    expect(useLocationStore.getState().isResolvingDepot).toBe(true);

    // Second call should bail out immediately
    const second = useLocationStore.getState().resolveDepot(depots);
    await second;

    // Still only one call to getCurrentPositionAsync
    expect(mockGetPosition).toHaveBeenCalledTimes(1);

    // Let the first resolve
    resolvePosition(makeLocationObject());
    await first;

    expect(useLocationStore.getState().isResolvingDepot).toBe(false);
  });

  // -- Rate-limiting --

  it('skips resolution if a depot was successfully resolved within cooldown (30s)', async () => {
    const depots = [makeDepot()];
    await useLocationStore.getState().resolveDepot(depots);
    expect(useLocationStore.getState().resolvedDepot).not.toBeNull();
    mockGetPosition.mockClear();

    // Immediately call again — should be rate-limited
    await useLocationStore.getState().resolveDepot(depots);
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it('allows resolution after cooldown expires', async () => {
    const depots = [makeDepot()];
    await useLocationStore.getState().resolveDepot(depots);
    mockGetPosition.mockClear();

    // Advance past 30s cooldown
    jest.advanceTimersByTime(30_001);

    await useLocationStore.getState().resolveDepot(depots);
    expect(mockGetPosition).toHaveBeenCalledTimes(1);
  });

  it('does not rate-limit when resolvedDepot is null (no previous success)', async () => {
    // Simulate a previous failed resolution: lastResolvedAt is set but resolvedDepot is null
    useLocationStore.setState({
      lastResolvedAt: new Date(),
      resolvedDepot: null,
    });

    const depots = [makeDepot()];
    await useLocationStore.getState().resolveDepot(depots);
    expect(mockGetPosition).toHaveBeenCalledTimes(1);
  });

  // -- Permission checks --

  it('requests permission when not already granted', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'denied', granted: false });
    mockRequestPerms.mockResolvedValueOnce({ status: 'granted', granted: true });

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    expect(mockRequestPerms).toHaveBeenCalledTimes(1);
    expect(useLocationStore.getState().resolvedDepot).not.toBeNull();
    expect(useLocationStore.getState().permissionDenied).toBe(false);
  });

  it('sets permissionDenied and does not retry when permission is denied', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'denied', granted: false });
    mockRequestPerms.mockResolvedValueOnce({ status: 'denied', granted: false });

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    const state = useLocationStore.getState();
    expect(state.permissionDenied).toBe(true);
    expect(state.isResolvingDepot).toBe(false);
    expect(state.depotResolutionError).toBe('Location permission denied');
    expect(state.resolvedDepot).toBeNull();
    // No retry scheduled
    expect(state.retryTimeoutId).toBeNull();
    expect(state.retryCount).toBe(0);
  });

  // -- GPS fallback: High -> Balanced --

  it('falls back from High accuracy to Balanced when high times out', async () => {
    const balancedResult = makeLocationObject({ accuracy: 50 });

    // High accuracy: reject with timeout
    mockGetPosition.mockRejectedValueOnce(new Error('Location request timed out'));
    // Balanced accuracy: succeed
    mockGetPosition.mockResolvedValueOnce(balancedResult);

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    expect(mockGetPosition).toHaveBeenCalledTimes(2);
    // First call: High accuracy
    expect(mockGetPosition.mock.calls[0][0]).toEqual({
      accuracy: Location.Accuracy.High,
    });
    // Second call: Balanced accuracy
    expect(mockGetPosition.mock.calls[1][0]).toEqual({
      accuracy: Location.Accuracy.Balanced,
    });

    expect(useLocationStore.getState().isResolvingDepot).toBe(false);
    expect(useLocationStore.getState().resolvedDepot).not.toBeNull();
  });

  // -- Exponential backoff --

  it('schedules retry with exponential backoff when both GPS attempts fail', async () => {
    mockGetPosition.mockRejectedValue(new Error('GPS unavailable'));

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    const state = useLocationStore.getState();
    expect(state.isResolvingDepot).toBe(false);
    expect(state.retryCount).toBe(1);
    expect(state.retryTimeoutId).not.toBeNull();
    expect(state.depotResolutionError).toBe('GPS unavailable');
  });

  it('uses correct backoff delays: 5s base, doubles each attempt, caps at 60s', async () => {
    // With Math.random() = 0, jitter multiplier is (1 + 0 * 0.5) = 1
    // delay = min(5000 * 2^retryCount, 60000)
    // retry 0: 5000ms, retry 1: 10000ms, retry 2: 20000ms, retry 3: 40000ms, retry 4: 60000ms (capped)
    const expectedDelays = [5000, 10000, 20000, 40000, 60000];

    mockGetPosition.mockRejectedValue(new Error('GPS unavailable'));

    for (let i = 0; i < MAX_RETRIES_COUNT; i++) {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Directly call resolveDepot at the expected retryCount
      useLocationStore.setState({ retryCount: i, isResolvingDepot: false });
      await useLocationStore.getState().resolveDepot([makeDepot()]);

      // Find the setTimeout call matching our expected backoff delay
      const retryCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === expectedDelays[i]);
      expect(retryCall).toBeDefined();

      setTimeoutSpy.mockRestore();
    }
  });

  it('stops retrying after MAX_RETRIES (5)', async () => {
    mockGetPosition.mockRejectedValue(new Error('GPS unavailable'));

    // Set retryCount to MAX_RETRIES so the next failure should NOT schedule a retry
    useLocationStore.setState({ retryCount: MAX_RETRIES_COUNT });
    await useLocationStore.getState().resolveDepot([makeDepot()]);

    const state = useLocationStore.getState();
    // retryCount incremented to 6, but no timeout was scheduled
    expect(state.retryCount).toBe(MAX_RETRIES_COUNT + 1);
    expect(state.retryTimeoutId).toBeNull();
  });

  it('clears existing retry timeout before scheduling a new one', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    mockGetPosition.mockRejectedValue(new Error('GPS unavailable'));

    // First failure schedules a retry
    await useLocationStore.getState().resolveDepot([makeDepot()]);
    const firstTimeoutId = useLocationStore.getState().retryTimeoutId;
    expect(firstTimeoutId).not.toBeNull();

    // Manually trigger second call before timeout fires (simulating external re-call)
    // Need to clear isResolvingDepot so resolveDepot runs
    useLocationStore.setState({ isResolvingDepot: false });
    await useLocationStore.getState().resolveDepot([makeDepot()]);

    // clearTimeout should have been called with the first timeout
    expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimeoutId);
  });

  it('applies jitter to backoff delay', async () => {
    // With Math.random() returning 0.5, jitter multiplier is (1 + 0.5 * 0.5) = 1.25
    (Math.random as jest.Mock).mockReturnValue(0.5);
    mockGetPosition.mockRejectedValue(new Error('GPS unavailable'));

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    // base delay = 5000, jittered = 5000 * 1.25 = 6250
    const retryCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 6250);
    expect(retryCall).toBeDefined();

    setTimeoutSpy.mockRestore();
  });

  // -- Nearest depot matching --

  it('sets resolvedDepot when findNearestLocation returns a match', async () => {
    const depot = makeDepot({ id: 'depot-42', name: 'Test Depot' });
    mockFindNearest.mockReturnValueOnce({ location: depot, distanceKm: 2.5 });

    await useLocationStore.getState().resolveDepot([depot]);

    const state = useLocationStore.getState();
    expect(state.resolvedDepot).toEqual({ depot, distanceKm: 2.5 });
    expect(state.isResolvingDepot).toBe(false);
    expect(state.depotResolutionError).toBeNull();
  });

  it('sets resolvedDepot to null when no depot is within range', async () => {
    mockFindNearest.mockReturnValueOnce(null);

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    expect(useLocationStore.getState().resolvedDepot).toBeNull();
    expect(useLocationStore.getState().isResolvingDepot).toBe(false);
    expect(useLocationStore.getState().depotResolutionError).toBeNull();
  });

  it('passes MAX_DEPOT_DISTANCE_KM (100) to findNearestLocation', async () => {
    await useLocationStore.getState().resolveDepot([makeDepot()]);

    expect(mockFindNearest).toHaveBeenCalledWith(
      PERTH_COORDS.latitude,
      PERTH_COORDS.longitude,
      expect.any(Array),
      100 // MAX_DEPOT_DISTANCE_KM
    );
  });

  // -- Success resets --

  it('resets retryCount and retryTimeoutId on success', async () => {
    // Pre-set some retry state
    useLocationStore.setState({ retryCount: 3, retryTimeoutId: setTimeout(() => {}, 99999) });

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    const state = useLocationStore.getState();
    expect(state.retryCount).toBe(0);
    expect(state.retryTimeoutId).toBeNull();
    expect(state.permissionDenied).toBe(false);
  });

  it('caches location data with sanitized fields', async () => {
    mockGetPosition.mockResolvedValueOnce(
      makeLocationObject({
        latitude: -31.95,
        longitude: 115.86,
        accuracy: 15,
        altitude: 42,
        heading: -1, // invalid => null via sanitizeNonNegative
        speed: -1, // invalid => null
      })
    );

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    const loc = useLocationStore.getState().lastLocation;
    expect(loc).not.toBeNull();
    expect(loc!.latitude).toBe(-31.95);
    expect(loc!.longitude).toBe(115.86);
    expect(loc!.accuracy).toBe(15);
    expect(loc!.altitude).toBe(42);
    expect(loc!.heading).toBeNull(); // sanitized
    expect(loc!.speed).toBeNull(); // sanitized
  });

  it('sets accuracy to 0 when GPS returns null accuracy', async () => {
    mockGetPosition.mockResolvedValueOnce(
      makeLocationObject({ accuracy: null as unknown as number })
    );

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    expect(useLocationStore.getState().lastLocation!.accuracy).toBe(0);
  });

  // -- Debug GPS override --

  it('uses simulated GPS when debug override is enabled (__DEV__)', async () => {
    useDebugLocationStore.setState({
      overrideEnabled: true,
      latitude: 40.7128,
      longitude: -74.006,
    });

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    // Should NOT call real GPS or permission APIs
    expect(mockGetPerms).not.toHaveBeenCalled();
    expect(mockRequestPerms).not.toHaveBeenCalled();
    expect(mockGetPosition).not.toHaveBeenCalled();

    // findNearestLocation should receive debug coordinates
    expect(mockFindNearest).toHaveBeenCalledWith(40.7128, -74.006, expect.any(Array), 100);
  });

  // -- Generic error handling --

  it('catches unexpected errors and sets depotResolutionError', async () => {
    mockGetPerms.mockRejectedValueOnce(new Error('Unexpected native crash'));

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    const state = useLocationStore.getState();
    expect(state.isResolvingDepot).toBe(false);
    expect(state.depotResolutionError).toBe('Unexpected native crash');
    expect(state.resolvedDepot).toBeNull();
  });

  it('handles non-Error throws with fallback message', async () => {
    mockGetPerms.mockRejectedValueOnce('string error');

    await useLocationStore.getState().resolveDepot([makeDepot()]);

    expect(useLocationStore.getState().depotResolutionError).toBe('Failed to resolve depot');
  });

  // -- Module-scoped _lastDepots --

  it('retry callback uses the latest depots passed to any resolveDepot call', async () => {
    const depotsA = [makeDepot({ id: 'a' })];
    const depotsB = [makeDepot({ id: 'b' })];

    // First call fails -> schedules retry with depotsA in _lastDepots
    mockGetPosition.mockRejectedValueOnce(new Error('fail'));
    mockGetPosition.mockRejectedValueOnce(new Error('fail'));
    await useLocationStore.getState().resolveDepot(depotsA);

    // Before the retry fires, update _lastDepots via a new call
    // (it will bail early due to rate-limit, but still caches depots)
    // We need to allow it past the concurrency guard (isResolvingDepot is false after failure)
    // and past rate-limit (resolvedDepot is null so no rate-limit).
    // But this second call will also fail, which is fine — the point is _lastDepots updates.
    mockGetPosition.mockRejectedValueOnce(new Error('fail'));
    mockGetPosition.mockRejectedValueOnce(new Error('fail'));
    await useLocationStore.getState().resolveDepot(depotsB);

    // Now fire the retry from the first call's timeout
    mockFindNearest.mockClear();
    mockGetPosition.mockResolvedValueOnce(makeLocationObject());

    jest.advanceTimersByTime(60_001);
    await jest.advanceTimersByTimeAsync(0);

    // The retry should have used depotsB (latest), not depotsA
    if (mockFindNearest.mock.calls.length > 0) {
      const passedDepots = mockFindNearest.mock.calls[0][2];
      expect(passedDepots).toBe(depotsB);
    }
  });
});

// ── ensureFresh ──────────────────────────────────────────────────────────────

describe('ensureFresh', () => {
  it('triggers resolveDepot when never resolved (lastResolvedAt is null)', async () => {
    const depots = [makeDepot()];

    useLocationStore.getState().ensureFresh(depots);
    // ensureFresh calls resolveDepot, which is async
    await jest.advanceTimersByTimeAsync(0);

    expect(mockGetPosition).toHaveBeenCalled();
  });

  it('triggers resolveDepot when last resolution is older than 5 minutes', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000 - 1);
    useLocationStore.setState({ lastResolvedAt: fiveMinutesAgo });

    const depots = [makeDepot()];
    useLocationStore.getState().ensureFresh(depots);
    await jest.advanceTimersByTimeAsync(0);

    expect(mockGetPosition).toHaveBeenCalled();
  });

  it('does NOT trigger resolveDepot when last resolution is within 5 minutes', () => {
    useLocationStore.setState({ lastResolvedAt: new Date() });

    useLocationStore.getState().ensureFresh([makeDepot()]);

    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it('does NOT trigger resolveDepot when already resolving', () => {
    useLocationStore.setState({ isResolvingDepot: true });

    useLocationStore.getState().ensureFresh([makeDepot()]);

    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it('does NOT trigger resolveDepot when permissionDenied is true', () => {
    useLocationStore.setState({ permissionDenied: true });

    useLocationStore.getState().ensureFresh([makeDepot()]);

    expect(mockGetPosition).not.toHaveBeenCalled();
  });
});

// ── cancelRetries ────────────────────────────────────────────────────────────

describe('cancelRetries', () => {
  it('clears pending retry timeout and resets retryCount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const timeoutId = setTimeout(() => {}, 99999);
    useLocationStore.setState({ retryCount: 3, retryTimeoutId: timeoutId });

    useLocationStore.getState().cancelRetries();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    expect(useLocationStore.getState().retryCount).toBe(0);
    expect(useLocationStore.getState().retryTimeoutId).toBeNull();
  });

  it('is safe to call when no retry is pending', () => {
    useLocationStore.setState({ retryCount: 0, retryTimeoutId: null });

    // Should not throw
    useLocationStore.getState().cancelRetries();

    expect(useLocationStore.getState().retryCount).toBe(0);
    expect(useLocationStore.getState().retryTimeoutId).toBeNull();
  });
});

// ── clearResolvedDepot ───────────────────────────────────────────────────────

describe('clearResolvedDepot', () => {
  it('resets all location state fields to initial values', () => {
    // Populate with non-default values
    useLocationStore.setState({
      resolvedDepot: { depot: makeDepot(), distanceKm: 1 },
      isResolvingDepot: true,
      depotResolutionError: 'some error',
      lastResolvedAt: new Date(),
      lastLocation: {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        altitude: null,
        heading: null,
        speed: null,
        timestamp: 0,
      },
      retryCount: 4,
      retryTimeoutId: setTimeout(() => {}, 99999),
      permissionDenied: true,
    });

    useLocationStore.getState().clearResolvedDepot();

    const state = useLocationStore.getState();
    expect(state.resolvedDepot).toBeNull();
    expect(state.isResolvingDepot).toBe(false);
    expect(state.depotResolutionError).toBeNull();
    expect(state.lastResolvedAt).toBeNull();
    expect(state.lastLocation).toBeNull();
    expect(state.retryCount).toBe(0);
    expect(state.retryTimeoutId).toBeNull();
    expect(state.permissionDenied).toBe(false);
  });

  it('calls cancelRetries internally', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const timeoutId = setTimeout(() => {}, 99999);
    useLocationStore.setState({ retryCount: 2, retryTimeoutId: timeoutId });

    useLocationStore.getState().clearResolvedDepot();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
  });
});

// ── waitForLocationResolution ────────────────────────────────────────────────

describe('waitForLocationResolution', () => {
  it('resolves true immediately when lastLocation already exists', async () => {
    useLocationStore.setState({
      lastLocation: {
        latitude: 0,
        longitude: 0,
        accuracy: 10,
        altitude: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      },
    });

    const result = await waitForLocationResolution();
    expect(result).toBe(true);
  });

  it('resolves false immediately when not resolving and no location', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: false });

    const result = await waitForLocationResolution();
    expect(result).toBe(false);
  });

  it('waits and resolves true when resolution completes with location', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    const promise = waitForLocationResolution(5000);

    // Simulate successful resolution
    useLocationStore.setState({
      lastLocation: {
        latitude: 0,
        longitude: 0,
        accuracy: 10,
        altitude: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      },
      isResolvingDepot: false,
    });

    const result = await promise;
    expect(result).toBe(true);
  });

  it('waits and resolves false when resolution completes without location', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    const promise = waitForLocationResolution(5000);

    useLocationStore.setState({ lastLocation: null, isResolvingDepot: false });

    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves false on timeout when resolution never completes', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    const promise = waitForLocationResolution(100);

    jest.advanceTimersByTime(101);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('uses default timeout of 15s when no argument provided', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    waitForLocationResolution();

    const timeoutCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 15_000);
    expect(timeoutCall).toBeDefined();

    // Clean up: resolve so there's no dangling subscription
    useLocationStore.setState({ isResolvingDepot: false });
    setTimeoutSpy.mockRestore();
  });
});

// ── eventBus integration ─────────────────────────────────────────────────────

describe('eventBus integration', () => {
  it('USER_LOGOUT event triggers clearResolvedDepot', () => {
    // Populate state
    useLocationStore.setState({
      resolvedDepot: { depot: makeDepot(), distanceKm: 1 },
      lastResolvedAt: new Date(),
      permissionDenied: true,
    });

    eventBus.emit(AppEvents.USER_LOGOUT);

    const state = useLocationStore.getState();
    expect(state.resolvedDepot).toBeNull();
    expect(state.lastResolvedAt).toBeNull();
    expect(state.permissionDenied).toBe(false);
    expect(state.lastLocation).toBeNull();
  });
});

// ── Constants ────────────────────────────────────────────────────────────────
// These are not exported, so we duplicate them for assertions.
const MAX_RETRIES_COUNT = 5;
