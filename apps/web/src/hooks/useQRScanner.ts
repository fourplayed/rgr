import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { parseQRCode } from '@rgr/shared';

export interface QRScannerState {
  isScanning: boolean;
  isInitializing: boolean;
  error: string | null;
  hasPermission: boolean | null;
  scannedValue: string | null;
  assetId: string | null;
}

export interface QRScannerConfig {
  fps?: number;
  qrbox?: { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  preferFrontCamera?: boolean;
}

export interface UseQRScannerReturn {
  state: QRScannerState;
  startScanning: (elementId: string) => Promise<void>;
  stopScanning: () => Promise<void>;
  switchCamera: () => Promise<void>;
  resetScanner: () => void;
  parseQRCode: (value: string) => { isValid: boolean; assetId: string | null };
}

const DEFAULT_CONFIG: QRScannerConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  disableFlip: false,
  preferFrontCamera: false,
};

/**
 * Utility to stop all tracks from a MediaStream
 */
function stopAllMediaTracks(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Custom hook for QR code scanning using html5-qrcode
 * Optimized for iOS Safari compatibility
 */
export function useQRScanner(
  onScanSuccess?: (assetId: string, rawValue: string) => void,
  config: QRScannerConfig = {}
): UseQRScannerReturn {
  const [state, setState] = useState<QRScannerState>({
    isScanning: false,
    isInitializing: false,
    error: null,
    hasPermission: null,
    scannedValue: null,
    assetId: null,
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentCameraRef = useRef<'back' | 'front'>('back');
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  /**
   * Parse QR code value and extract asset ID using shared utility
   */
  const parseQRCodeValue = useCallback((value: string): { isValid: boolean; assetId: string | null } => {
    const result = parseQRCode(value);
    if (result.assetId) {
      return { isValid: true, assetId: result.assetId };
    }
    return { isValid: false, assetId: null };
  }, []);

  /**
   * Handle successful QR code scan
   */
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const { isValid, assetId } = parseQRCodeValue(decodedText);

      setState((prev) => ({
        ...prev,
        scannedValue: decodedText,
        assetId,
        error: isValid ? null : 'Invalid QR code format. Expected: rgr://asset/{UUID}',
      }));

      if (isValid && assetId && onScanSuccess) {
        onScanSuccess(assetId, decodedText);
      }
    },
    [parseQRCodeValue, onScanSuccess]
  );

  /**
   * Handle scan error (mostly just for debugging, not user-facing)
   */
  const handleScanError = useCallback((errorMessage: string) => {
    // QR code not found in frame is expected - don't show error
    if (errorMessage.includes('No MultiFormat Readers')) {
      return;
    }
    console.debug('QR scan frame:', errorMessage);
  }, []);

  /**
   * Get camera configuration based on preference
   */
  const getCameraConfig = useCallback(() => {
    const facingMode = currentCameraRef.current === 'front' ? 'user' : 'environment';
    return { facingMode };
  }, []);

  /**
   * Start the QR scanner
   */
  const startScanning = useCallback(
    async (elementId: string) => {
      if (scannerRef.current) {
        const scannerState = scannerRef.current.getState();
        if (scannerState === Html5QrcodeScannerState.SCANNING) {
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        isInitializing: true,
        error: null,
        scannedValue: null,
        assetId: null,
      }));

      try {
        // Check for camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera is not supported on this device');
        }

        // Request camera permission
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
          setState((prev) => ({ ...prev, hasPermission: true }));
        } catch (permError) {
          setState((prev) => ({ ...prev, hasPermission: false }));
          throw new Error('Camera permission denied. Please allow camera access to scan QR codes.');
        }

        // Create scanner instance
        scannerRef.current = new Html5Qrcode(elementId, {
          verbose: false,
          formatsToSupport: undefined, // Support all formats
        });

        // Start scanning with optimized config for iOS Safari
        await scannerRef.current.start(
          getCameraConfig(),
          {
            fps: mergedConfig.fps!,
            qrbox: mergedConfig.qrbox,
            aspectRatio: mergedConfig.aspectRatio,
            disableFlip: mergedConfig.disableFlip,
          },
          handleScanSuccess,
          handleScanError
        );

        // Capture the video stream for proper cleanup
        // The html5-qrcode library creates a video element we can access
        const videoElement = document.querySelector(`#${elementId} video`) as HTMLVideoElement | null;
        if (videoElement?.srcObject instanceof MediaStream) {
          streamRef.current = videoElement.srcObject;
        }

        setState((prev) => ({
          ...prev,
          isScanning: true,
          isInitializing: false,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
        setState((prev) => ({
          ...prev,
          isScanning: false,
          isInitializing: false,
          error: errorMessage,
        }));
      }
    },
    [getCameraConfig, handleScanSuccess, handleScanError, mergedConfig]
  );

  /**
   * Stop the QR scanner
   */
  const stopScanning = useCallback(async () => {
    // First, stop all media tracks to ensure camera is released
    stopAllMediaTracks(streamRef.current);
    streamRef.current = null;

    if (scannerRef.current) {
      try {
        const scannerState = scannerRef.current.getState();
        if (scannerState === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isScanning: false,
      isInitializing: false,
    }));
  }, []);

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    if (!scannerRef.current || !state.isScanning) {
      return;
    }

    try {
      // Stop current scanning
      await scannerRef.current.stop();

      // Toggle camera
      currentCameraRef.current = currentCameraRef.current === 'back' ? 'front' : 'back';

      // Restart with new camera
      await scannerRef.current.start(
        getCameraConfig(),
        {
          fps: mergedConfig.fps!,
          qrbox: mergedConfig.qrbox,
          aspectRatio: mergedConfig.aspectRatio,
          disableFlip: mergedConfig.disableFlip,
        },
        handleScanSuccess,
        handleScanError
      );
    } catch (err) {
      console.error('Error switching camera:', err);
      setState((prev) => ({
        ...prev,
        error: 'Failed to switch camera',
      }));
    }
  }, [state.isScanning, getCameraConfig, handleScanSuccess, handleScanError, mergedConfig]);

  /**
   * Reset scanner state
   */
  const resetScanner = useCallback(() => {
    setState({
      isScanning: false,
      isInitializing: false,
      error: null,
      hasPermission: null,
      scannedValue: null,
      assetId: null,
    });
  }, []);

  /**
   * Cleanup on unmount - ensures camera is properly released
   */
  useEffect(() => {
    return () => {
      // CRITICAL: Stop all media tracks to release camera hardware
      // This ensures the camera indicator light turns off and the camera
      // is available for other applications/components
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (scannerRef.current) {
        try {
          const scannerState = scannerRef.current.getState();
          if (scannerState === Html5QrcodeScannerState.SCANNING) {
            scannerRef.current.stop().catch(console.error);
          }
          scannerRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return {
    state,
    startScanning,
    stopScanning,
    switchCamera,
    resetScanner,
    parseQRCode: parseQRCodeValue,
  };
}
