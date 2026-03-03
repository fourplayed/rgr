import { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useCreateDefectReport } from '../useDefectData';
import type { Asset, Depot, PhotoType } from '@rgr/shared';
import type { AlertSheetState } from './useScanFlow';

export function useDefectFlow(deps: {
  addDebugLog: (msg: string) => void;
}) {
  const { addDebugLog } = deps;

  const [showDefectReport, setShowDefectReport] = useState(false);
  const [pendingDefectReport, setPendingDefectReport] = useState(false);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);
  const defectReportedRef = useRef(false);

  const { mutateAsync: createDefectReport } = useCreateDefectReport();

  /** Queue the defect report to show after the current modal's dismiss animation */
  const queueDefectReport = useCallback(() => {
    setPendingDefectReport(true);
  }, []);

  const handleDefectReportSubmit = useCallback(async (
    notes: string,
    wantsPhoto: boolean,
    context: {
      completedAsset: Asset | null;
      userId: string | null;
      lastScanEventId: string | null;
      matchedDepot: { depot: Depot; distanceKm: number } | null;
      setAlertSheet: (state: AlertSheetState) => void;
      queueCamera: (matchedDepot: { depot: Depot; distanceKm: number } | null, photoType?: PhotoType) => void;
      showSuccess: (items: Array<{ label: string; value?: string }>) => void;
    }
  ) => {
    const { completedAsset, userId, lastScanEventId, matchedDepot, setAlertSheet, queueCamera } = context;
    if (!completedAsset || !userId || !lastScanEventId) {
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Missing required information',
      });
      return;
    }

    setIsSubmittingDefect(true);
    addDebugLog('Submitting defect report...');

    try {
      await createDefectReport({
        assetId: completedAsset.id,
        reportedBy: userId,
        title: `Defect reported - ${completedAsset.assetNumber}`,
        description: notes,
        scanEventId: lastScanEventId,
      });
      addDebugLog('Defect report created');

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (wantsPhoto) {
        addDebugLog('User wants defect photo - pending camera');
        defectReportedRef.current = true;
        queueCamera(matchedDepot, 'damage');
        setShowDefectReport(false);
      } else {
        setShowDefectReport(false);
        context.showSuccess([
          {
            label: 'Asset location updated',
            value: matchedDepot?.depot.name ?? 'Location recorded',
          },
          { label: 'Defect report submitted' },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit defect report';
      addDebugLog(`ERROR: ${message}`);
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message,
      });
    } finally {
      setIsSubmittingDefect(false);
    }
  }, [createDefectReport, addDebugLog]);

  const handleDefectReportCancel = useCallback((queuePhotoPrompt: () => void) => {
    addDebugLog('Defect report cancelled');
    setShowDefectReport(false);
    queuePhotoPrompt();
  }, [addDebugLog]);

  /**
   * Called when the defect report's dismiss animation completes.
   * Resolves pending transitions. Returns true if handled.
   */
  const handleDefectReportDismiss = useCallback((resolvers: {
    pendingCamera: boolean;
    resolvePendingCamera: () => void;
    resolvePendingPhotoPrompt: () => boolean;
  }): void => {
    addDebugLog('Defect report dismissed (native callback)');
    if (resolvers.pendingCamera) {
      addDebugLog('Showing camera now');
      resolvers.resolvePendingCamera();
    } else {
      resolvers.resolvePendingPhotoPrompt();
    }
  }, [addDebugLog]);

  /**
   * Check and resolve pending defect report (called from other flows' dismiss callbacks).
   * Returns true if a pending state was resolved.
   */
  const resolvePending = useCallback((): boolean => {
    if (pendingDefectReport) {
      addDebugLog('Showing defect report now');
      setPendingDefectReport(false);
      setShowDefectReport(true);
      return true;
    }
    return false;
  }, [pendingDefectReport, addDebugLog]);

  const resetDefectFlow = useCallback(() => {
    setShowDefectReport(false);
    setPendingDefectReport(false);
    setIsSubmittingDefect(false);
    defectReportedRef.current = false;
  }, []);

  return {
    // State
    showDefectReport,
    isSubmittingDefect,
    pendingDefectReport,

    // Handlers
    handleDefectReportSubmit,
    handleDefectReportCancel,
    handleDefectReportDismiss,

    // Flow control
    queueDefectReport,
    resolvePending,
    resetDefectFlow,

    // Refs
    defectReportedRef,
  };
}
