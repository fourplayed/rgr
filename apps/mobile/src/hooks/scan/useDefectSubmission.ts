import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useCreateDefectReport } from '../useDefectData';
import { logger } from '../../utils/logger';
import type { ScanFlowAction, AlertSheetState } from './useScanActionFlow';
import type { Profile } from '@rgr/shared';

export function useDefectSubmission(
  dispatch: React.Dispatch<ScanFlowAction>,
  helpers: {
    user: Profile | null;
    setAlertSheet: (state: AlertSheetState) => void;
    addDebugLog: (msg: string) => void;
  },
) {
  const { user, setAlertSheet, addDebugLog } = helpers;

  const { mutateAsync: createDefectReport, isPending: isSubmittingDefect } =
    useCreateDefectReport();

  const handleDefectPress = useCallback(() => {
    dispatch({ type: 'OPEN_SHEET', sheet: 'defect' });
  }, [dispatch]);

  const handleDefectSubmit = useCallback(
    async (
      notes: string,
      wantsPhoto: boolean,
      scannedAssetId: string,
      lastScanEventId: string,
    ) => {
      addDebugLog('Submitting defect report...');
      if (!user) {
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Session Expired',
          message: 'Please log in again.',
        });
        return;
      }
      try {
        await createDefectReport({
          assetId: scannedAssetId,
          reportedBy: user.id,
          title: 'Defect reported',
          description: notes,
          scanEventId: lastScanEventId,
        });

        addDebugLog('Defect report created');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        dispatch({ type: 'MARK_DEFECT_COMPLETED' });
        if (wantsPhoto) {
          dispatch({ type: 'CLOSE_SHEET', pendingSheet: 'camera' });
        } else {
          dispatch({ type: 'CLOSE_SHEET' });
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to submit defect report';
        addDebugLog(`ERROR: ${message}`);
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Error',
          message,
        });
      }
    },
    [user, createDefectReport, addDebugLog, setAlertSheet, dispatch],
  );

  const handleDefectCancel = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET' });
  }, [dispatch]);

  return { handleDefectPress, handleDefectSubmit, handleDefectCancel, isSubmittingDefect };
}
