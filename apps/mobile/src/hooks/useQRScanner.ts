import { useState, useRef, useEffect, useCallback } from 'react';
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
  debounceMs: number = 2000
): UseQRScannerResult {
  const [scannedData, setScannedData] = useState<QRScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScanRef = useRef<{ data: string; timestamp: number } | null>(null);
  // Ref-based lock to prevent race conditions in async callback execution
  const isProcessingRef = useRef(false);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeout on unmount
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
    };
  }, []);

  const handleBarCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    // Prevent processing if already processing (use ref for immediate check)
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
      if (isMountedRef.current && isProcessingRef.current) {
        logger.warn('Scanner lock timeout - auto-resetting after 30s');
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    }, SCANNER_LOCK_TIMEOUT_MS);

    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update state only if still mounted
    if (!isMountedRef.current) {
      isProcessingRef.current = false;
      return;
    }

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
        // If callback fails, reset the lock so user can retry (only if mounted)
        if (isMountedRef.current) {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
      }
    }
  }, [debounceMs]);

  const resetScanner = useCallback(() => {
    if (!isMountedRef.current) return;
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
