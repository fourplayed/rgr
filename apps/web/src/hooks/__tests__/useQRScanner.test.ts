import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQRScanner } from '../useQRScanner';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

// Mock MediaStream for JSDOM environment
class MockMediaStream {
  active = true;
  id = 'mock-stream-id';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tracks: any[];

  constructor() {
    // Create persistent tracks that will be returned every time
    this.tracks = [{
      stop: vi.fn(),
      kind: 'video',
      enabled: true,
      readyState: 'live',
      id: 'mock-video-track'
    }];
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return [];
  }

  addTrack() {}
  removeTrack() {}

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

// @ts-expect-error - Global polyfill for JSDOM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.MediaStream = MockMediaStream as any;

// Mock html5-qrcode
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(),
  Html5QrcodeScannerState: {
    SCANNING: 2,
    PAUSED: 3,
    NOT_STARTED: 0,
  },
}));

// Mock @rgr/shared parseQRCode
vi.mock('@rgr/shared', () => ({
  parseQRCode: vi.fn((value: string) => {
    if (value.startsWith('rgr://asset/')) {
      const assetId = value.replace('rgr://asset/', '');
      return { isValid: true, assetId, protocol: 'rgr', type: 'asset' };
    }
    return { isValid: false, assetId: null };
  }),
}));

describe('useQRScanner', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockScanner: any;
  let mockMediaStream: MediaStream;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getUserMediaSpy: any;

  beforeEach(() => {
    // Create mock scanner instance
    mockScanner = {
      start: vi.fn(),
      stop: vi.fn(),
      clear: vi.fn(),
      getState: vi.fn(() => Html5QrcodeScannerState.NOT_STARTED),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Html5Qrcode as any).mockImplementation(() => mockScanner);

    // Create mock MediaStream instance using our polyfill
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockMediaStream = new MockMediaStream() as any;

    // Spy on the existing getUserMedia method (already setup in test/setup.ts)
    getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia')
      .mockResolvedValue(mockMediaStream);

    // Mock document.querySelector for video element
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.querySelector = vi.fn((selector: string) => {
      if (selector.includes('video')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { srcObject: mockMediaStream } as any;
      }
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useQRScanner());

    expect(result.current.state.isScanning).toBe(false);
    expect(result.current.state.isInitializing).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.hasPermission).toBeNull();
    expect(result.current.state.scannedValue).toBeNull();
    expect(result.current.state.assetId).toBeNull();
  });

  it('should start scanning successfully', async () => {
    const { result } = renderHook(() => useQRScanner());

    mockScanner.start.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    expect(result.current.state.isScanning).toBe(true);
    expect(result.current.state.isInitializing).toBe(false);
    expect(result.current.state.hasPermission).toBe(true);
    expect(mockScanner.start).toHaveBeenCalled();
  });

  it('should handle camera permission denied', async () => {
    const { result } = renderHook(() => useQRScanner());

    getUserMediaSpy.mockRejectedValue(
      new Error('Permission denied')
    );

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    expect(result.current.state.hasPermission).toBe(false);
    expect(result.current.state.error).toContain('Camera permission denied');
    expect(result.current.state.isScanning).toBe(false);
  });

  it('should handle missing camera support', async () => {
    // Replace mediaDevices with undefined to simulate missing support
    const savedMediaDevices = navigator.mediaDevices;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).mediaDevices = undefined;

    const { result } = renderHook(() => useQRScanner());

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    expect(result.current.state.error).toContain('Camera is not supported');

    // Restore mediaDevices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).mediaDevices = savedMediaDevices;
  });

  it('should parse valid QR code and call onScanSuccess', async () => {
    const onScanSuccess = vi.fn();
    const { result } = renderHook(() => useQRScanner(onScanSuccess));

    const validQRCode = 'rgr://asset/123e4567-e89b-12d3-a456-426614174000';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockScanner.start.mockImplementation((config: any, options: any, successCb: any) => {
      successCb(validQRCode);
      return Promise.resolve();
    });

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    await waitFor(() => {
      expect(result.current.state.scannedValue).toBe(validQRCode);
      expect(result.current.state.assetId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.current.state.error).toBeNull();
      expect(onScanSuccess).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        validQRCode
      );
    });
  });

  it('should handle invalid QR code format', async () => {
    const onScanSuccess = vi.fn();
    const { result } = renderHook(() => useQRScanner(onScanSuccess));

    const invalidQRCode = 'https://example.com/invalid';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockScanner.start.mockImplementation((config: any, options: any, successCb: any) => {
      successCb(invalidQRCode);
      return Promise.resolve();
    });

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    await waitFor(() => {
      expect(result.current.state.scannedValue).toBe(invalidQRCode);
      expect(result.current.state.assetId).toBeNull();
      expect(result.current.state.error).toContain('Invalid QR code format');
      expect(onScanSuccess).not.toHaveBeenCalled();
    });
  });

  it('should stop scanning and cleanup resources', async () => {
    const { result } = renderHook(() => useQRScanner());

    mockScanner.start.mockResolvedValue(undefined);
    mockScanner.getState.mockReturnValue(Html5QrcodeScannerState.SCANNING);
    mockScanner.stop.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    expect(result.current.state.isScanning).toBe(true);

    await act(async () => {
      await result.current.stopScanning();
    });

    expect(mockScanner.stop).toHaveBeenCalled();
    expect(mockScanner.clear).toHaveBeenCalled();
    expect(result.current.state.isScanning).toBe(false);
  });

  it('should switch camera', async () => {
    const { result } = renderHook(() => useQRScanner());

    mockScanner.start.mockResolvedValue(undefined);
    mockScanner.stop.mockResolvedValue(undefined);
    mockScanner.getState.mockReturnValue(Html5QrcodeScannerState.SCANNING);

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    await act(async () => {
      await result.current.switchCamera();
    });

    expect(mockScanner.stop).toHaveBeenCalled();
    expect(mockScanner.start).toHaveBeenCalledTimes(2);
  });

  it('should not switch camera if not scanning', async () => {
    const { result } = renderHook(() => useQRScanner());

    await act(async () => {
      await result.current.switchCamera();
    });

    expect(mockScanner.stop).not.toHaveBeenCalled();
  });

  it('should reset scanner state', () => {
    const { result } = renderHook(() => useQRScanner());

    act(() => {
      result.current.resetScanner();
    });

    expect(result.current.state).toEqual({
      isScanning: false,
      isInitializing: false,
      error: null,
      hasPermission: null,
      scannedValue: null,
      assetId: null,
    });
  });

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useQRScanner());

    mockScanner.start.mockResolvedValue(undefined);
    mockScanner.getState.mockReturnValue(Html5QrcodeScannerState.SCANNING);
    mockScanner.stop.mockResolvedValue(undefined);

    // Get reference to track stop mock before starting
    const trackStopMock = mockMediaStream.getTracks()[0].stop;

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    // Verify the stream is set up correctly
    expect(result.current.state.isScanning).toBe(true);

    // Unmount triggers cleanup
    unmount();

    // Wait a tick for cleanup to run
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify track was stopped during cleanup
    expect(trackStopMock).toHaveBeenCalled();
  });

  it('should not start if already scanning', async () => {
    const { result } = renderHook(() => useQRScanner());

    mockScanner.start.mockResolvedValue(undefined);
    mockScanner.getState.mockReturnValue(Html5QrcodeScannerState.SCANNING);

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    const startCallCount = mockScanner.start.mock.calls.length;

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    // Should not call start again
    expect(mockScanner.start).toHaveBeenCalledTimes(startCallCount);
  });

  it('should use custom config', async () => {
    const customConfig = {
      fps: 20,
      qrbox: { width: 300, height: 300 },
      aspectRatio: 1.5,
      disableFlip: true,
    };

    const { result } = renderHook(() => useQRScanner(undefined, customConfig));

    mockScanner.start.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.startScanning('qr-reader');
    });

    expect(mockScanner.start).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        fps: 20,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.5,
        disableFlip: true,
      }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should parse QR code using parseQRCode utility', () => {
    const { result } = renderHook(() => useQRScanner());

    const validResult = result.current.parseQRCode('rgr://asset/test-id-123');
    expect(validResult.isValid).toBe(true);
    expect(validResult.assetId).toBe('test-id-123');

    const invalidResult = result.current.parseQRCode('invalid-qr');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.assetId).toBeNull();
  });

  it('should set initializing state during startup', async () => {
    const { result } = renderHook(() => useQRScanner());

    let resolveStart: (() => void) | null = null;
    mockScanner.start.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveStart = resolve;
      });
    });

    act(() => {
      result.current.startScanning('qr-reader');
    });

    await waitFor(() => {
      expect(result.current.state.isInitializing).toBe(true);
    });

    await act(async () => {
      resolveStart!();
    });

    await waitFor(() => {
      expect(result.current.state.isInitializing).toBe(false);
    });
  });
});
