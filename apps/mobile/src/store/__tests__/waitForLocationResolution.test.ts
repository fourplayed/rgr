import { useLocationStore, waitForLocationResolution } from '../locationStore';
import type { CachedLocationData } from '../locationStore';

const mockLocation: CachedLocationData = {
  latitude: 40.7128,
  longitude: -74.006,
  accuracy: 10,
  altitude: null,
  heading: null,
  speed: null,
  timestamp: Date.now(),
};

beforeEach(() => {
  // Reset store to clean state between tests
  useLocationStore.setState({
    lastLocation: null,
    isResolvingDepot: false,
    resolvedDepot: null,
    depotResolutionError: null,
    lastResolvedAt: null,
    retryCount: 0,
    retryTimeoutId: null,
    permissionDenied: false,
  });
});

describe('waitForLocationResolution', () => {
  it('resolves true immediately when lastLocation already exists', async () => {
    useLocationStore.setState({ lastLocation: mockLocation });

    const result = await waitForLocationResolution();

    expect(result).toBe(true);
  });

  it('resolves false immediately when not resolving and no location', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: false });

    const result = await waitForLocationResolution();

    expect(result).toBe(false);
  });

  it('resolves true when store updates with location during subscription', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    const promise = waitForLocationResolution(5_000);

    // Simulate GPS resolution completing
    useLocationStore.setState({
      lastLocation: mockLocation,
      isResolvingDepot: false,
    });

    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves false when resolution finishes without location', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    const promise = waitForLocationResolution(5_000);

    // Simulate GPS resolution failing (no location, but done resolving)
    useLocationStore.setState({
      lastLocation: null,
      isResolvingDepot: false,
      depotResolutionError: 'Location permission denied',
    });

    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves false on timeout', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    // Use a very short timeout so the test doesn't hang
    const result = await waitForLocationResolution(50);

    expect(result).toBe(false);
  });

  it('cleans up subscription after resolution', async () => {
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    const subscribeSpy = jest.spyOn(useLocationStore, 'subscribe');
    const promise = waitForLocationResolution(5_000);

    // The subscribe call returns an unsubscribe function
    const unsubscribeFn = subscribeSpy.mock.results[0]?.value;
    expect(typeof unsubscribeFn).toBe('function');

    // Resolve it
    useLocationStore.setState({ lastLocation: mockLocation, isResolvingDepot: false });
    await promise;

    // Further state changes should not cause issues (unsubscribed)
    useLocationStore.setState({ lastLocation: null, isResolvingDepot: true });

    subscribeSpy.mockRestore();
  });
});
