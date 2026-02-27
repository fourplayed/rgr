import { useState, useCallback, useRef } from 'react';
import type { Depot } from '@rgr/shared';
import { logger } from '../../utils/logger';

export function usePhotoFlow(deps: {
  addDebugLog: (msg: string) => void;
  resetAllScanState: () => void;
}) {
  const { addDebugLog, resetAllScanState } = deps;

  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [pendingPhotoPrompt, setPendingPhotoPrompt] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingCamera, setPendingCamera] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [pendingSuccessSheet, setPendingSuccessSheet] = useState(false);
  const [successItems, setSuccessItems] = useState<Array<{ label: string; value?: string }>>([]);

  const photoUploadedRef = useRef(false);
  // Capture matchedDepot when camera opens to prevent stale closure issues
  const matchedDepotForCameraRef = useRef<{ depot: Depot; distanceKm: number } | null>(null);

  /** Queue the photo prompt to show after the current modal's dismiss animation */
  const queuePhotoPrompt = useCallback(() => {
    setPendingPhotoPrompt(true);
  }, []);

  /** Queue the camera to show after the current modal's dismiss animation */
  const queueCamera = useCallback((currentMatchedDepot: { depot: Depot; distanceKm: number } | null) => {
    matchedDepotForCameraRef.current = currentMatchedDepot;
    setPendingCamera(true);
  }, []);

  const handlePhotoPromptAddPhoto = useCallback((matchedDepot: { depot: Depot; distanceKm: number } | null) => {
    addDebugLog('Add Photo tapped - pending camera');
    matchedDepotForCameraRef.current = matchedDepot;
    setPendingCamera(true);
    setShowPhotoPrompt(false);
  }, [addDebugLog]);

  const handlePhotoPromptSkip = useCallback((matchedDepot: { depot: Depot; distanceKm: number } | null) => {
    setSuccessItems([
      {
        label: 'Asset location updated',
        value: matchedDepot?.depot.name ?? 'Location recorded',
      },
    ]);
    setPendingSuccessSheet(true);
    setShowPhotoPrompt(false);
  }, []);

  /**
   * Called when the photo prompt's dismiss animation completes.
   * Resolves pending transitions.
   */
  const handlePhotoPromptDismiss = useCallback(() => {
    addDebugLog('Photo prompt dismissed (native callback)');
    if (pendingCamera) {
      addDebugLog('Showing camera now');
      setPendingCamera(false);
      setShowCamera(true);
    } else if (pendingSuccessSheet) {
      addDebugLog('Showing success sheet now');
      setPendingSuccessSheet(false);
      setShowSuccessSheet(true);
    }
  }, [pendingCamera, pendingSuccessSheet, addDebugLog]);

  const handleCameraClose = useCallback((defectReported: boolean) => {
    const depotName = matchedDepotForCameraRef.current?.depot.name ?? 'Location recorded';
    const items: Array<{ label: string; value?: string }> = [
      {
        label: 'Asset location updated',
        value: depotName,
      },
    ];
    if (defectReported) {
      items.push({ label: 'Defect report submitted' });
    }
    if (photoUploadedRef.current) {
      items.push({ label: 'Photo successfully uploaded' });
    }
    setSuccessItems(items);
    setPendingSuccessSheet(true);
    setShowCamera(false);
  }, []);

  const handleCameraDismiss = useCallback(() => {
    addDebugLog('Camera dismissed (native callback)');
    if (pendingSuccessSheet) {
      addDebugLog('Showing success sheet now');
      setPendingSuccessSheet(false);
      setShowSuccessSheet(true);
      photoUploadedRef.current = false;
    }
  }, [pendingSuccessSheet, addDebugLog]);

  const handlePhotoUploaded = useCallback(() => {
    logger.scan('Photo uploaded successfully');
    photoUploadedRef.current = true;
  }, []);

  const handleSuccessDismiss = useCallback(() => {
    resetAllScanState();
  }, [resetAllScanState]);

  /** Directly show the success sheet with custom items (e.g., from defect flow completion) */
  const showSuccessWithItems = useCallback((items: Array<{ label: string; value?: string }>) => {
    setSuccessItems(items);
    setShowSuccessSheet(true);
  }, []);

  /**
   * Check and resolve pending photo prompt (called from other flows' dismiss callbacks).
   * Returns true if a pending state was resolved.
   */
  const resolvePending = useCallback((): boolean => {
    if (pendingPhotoPrompt) {
      addDebugLog('Showing photo prompt now');
      setPendingPhotoPrompt(false);
      setShowPhotoPrompt(true);
      return true;
    }
    return false;
  }, [pendingPhotoPrompt, addDebugLog]);

  const resetPhotoFlow = useCallback(() => {
    setShowPhotoPrompt(false);
    setShowCamera(false);
    setShowSuccessSheet(false);
    setPendingPhotoPrompt(false);
    setPendingCamera(false);
    setPendingSuccessSheet(false);
    setSuccessItems([]);
    photoUploadedRef.current = false;
    matchedDepotForCameraRef.current = null;
  }, []);

  return {
    // State
    showPhotoPrompt,
    showCamera,
    showSuccessSheet,
    successItems,
    pendingPhotoPrompt,
    pendingCamera,

    // Handlers
    handlePhotoPromptAddPhoto,
    handlePhotoPromptSkip,
    handlePhotoPromptDismiss,
    handleCameraClose,
    handleCameraDismiss,
    handlePhotoUploaded,
    handleSuccessDismiss,

    // Flow control
    queuePhotoPrompt,
    queueCamera,
    resolvePending,
    showSuccessWithItems,
    resetPhotoFlow,

    // Refs (for external read)
    photoUploadedRef,
    matchedDepotForCameraRef,
  };
}
