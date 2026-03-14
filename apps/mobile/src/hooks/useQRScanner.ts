import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import type { BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { isValidQRCode } from '@rgr/shared';
import { logger } from '../utils/logger';

// Safety timeout to prevent permanently stuck scanner state
const SCANNER_LOCK_TIMEOUT_MS = 30000;

export interface QRScanResult {
  data: string;
  timestamp: number;
}

interface UseQRScannerResult {
  scannedData: QRScanResult | null;
  isProcessing: boolean;
  handleBarCodeScanned: (result: BarcodeScanningResult) => void;
  resetScanner: () => void;
}

/**
 * Hook for managing QR code scanning state
 * Includes debouncing to prevent multiple scans of the same code
 * Uses ref-based lock to prevent race conditions with async callbacks
 * Includes a 30-second safety timeout to prevent permanently stuck scanner state
 */
export function useQRScanner(
  onScan?: (data: string) => void | Promise<void>,
  debounceMs: number = 2000,
  onInvalidQR?: () => void
): UseQRScannerResult {
  const [scannedData, setScannedData] = useState<QRScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScanRef = useRef<{ data: string; timestamp: number } | null>(null);
  // Ref-based lock to prevent race conditions in async callback execution
  const isProcessingRef = useRef(false);
  // Safety timeout to prevent stuck scanner state
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store onScan in a ref to avoid stale closures and unnecessary callback recreation.
  // The parent typically passes an inline function that captures component state;
  // using a ref ensures handleBarCodeScanned always calls the latest version
  // without being recreated on every parent render.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const onInvalidQRRef = useRef(onInvalidQR);
  useEffect(() => {
    onInvalidQRRef.current = onInvalidQR;
  }, [onInvalidQR]);

  // Pause scanning when app goes to background to prevent phantom callbacks
  const isPausedRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      isPausedRef.current = nextState !== 'active';
    });

    return () => {
      subscription.remove();
      // Clear any pending timeout on unmount
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
    };
  }, []);

  const handleBarCodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      // Prevent processing if app is backgrounded or already processing
      if (isPausedRef.current) return;
      if (isProcessingRef.current) {
        return;
      }

      const { data } = result;
      const now = Date.now();

      // Debounce: Ignore if same code scanned within debounce window
      if (
        lastScanRef.current &&
        lastScanRef.current.data === data &&
        now - lastScanRef.current.timestamp < debounceMs
      ) {
        return;
      }

      // Validate QR code format
      if (!isValidQRCode(data)) {
        logger.warn('Invalid QR code format', data);
        onInvalidQRRef.current?.();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Set ref lock immediately to prevent concurrent processing
      isProcessingRef.current = true;

      // Clear any existing timeout
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }

      // Set safety timeout to auto-reset lock if stuck (e.g., callback never completes)
      lockTimeoutRef.current = setTimeout(() => {
        if (isProcessingRef.current) {
          logger.warn('Scanner lock timeout - auto-resetting after 30s');
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      }, SCANNER_LOCK_TIMEOUT_MS);

      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const scanResult: QRScanResult = {
        data,
        timestamp: now,
      };

      lastScanRef.current = { data, timestamp: now };
      setScannedData(scanResult);
      setIsProcessing(true);

      // Call callback via ref to always use the latest version (avoids stale closures)
      const callback = onScanRef.current;
      if (callback) {
        try {
          await callback(data);
        } catch {
          // Error handling is done by the caller; lock is released in finally
        } finally {
          // Always release the lock after callback completes (success or failure)
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      }
    },
    [debounceMs]
  );

  const resetScanner = useCallback(() => {
    // Clear safety timeout when manually reset
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setScannedData(null);
    setIsProcessing(false);
    isProcessingRef.current = false;
    lastScanRef.current = null;
  }, []);

  return {
    scannedData,
    isProcessing,
    handleBarCodeScanned,
    resetScanner,
  };
}
