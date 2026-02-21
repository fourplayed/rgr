import { useState, useRef } from 'react';
import type { BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { isValidQRCode } from '@rgr/shared';

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
 */
export function useQRScanner(
  onScan?: (data: string) => void,
  debounceMs: number = 2000
): UseQRScannerResult {
  const [scannedData, setScannedData] = useState<QRScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScanRef = useRef<{ data: string; timestamp: number } | null>(null);
  // Ref-based lock to prevent race conditions in async callback execution
  const isProcessingRef = useRef(false);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    // Prevent processing if already processing (use ref for immediate check)
    if (isProcessingRef.current || isProcessing) {
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
      console.warn('Invalid QR code format:', data);
      return;
    }

    // Set ref lock immediately to prevent concurrent processing
    isProcessingRef.current = true;

    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update state
    const scanResult: QRScanResult = {
      data,
      timestamp: now,
    };

    lastScanRef.current = { data, timestamp: now };
    setScannedData(scanResult);
    setIsProcessing(true);

    // Call callback if provided
    if (onScan) {
      try {
        await onScan(data);
      } catch {
        // If callback fails, reset the lock so user can retry
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setIsProcessing(false);
    isProcessingRef.current = false;
    lastScanRef.current = null;
  };

  return {
    scannedData,
    isProcessing,
    handleBarCodeScanned,
    resetScanner,
  };
}
