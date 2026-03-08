import { useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';
import type { ScanFlowAction, SheetId } from './useScanActionFlow';

export function useSheetLifecycle(dispatch: React.Dispatch<ScanFlowAction>) {
  // ── Photo capture tracking ──
  const photoUploadedRef = useRef(false);

  const handlePhotoPress = useCallback(() => {
    photoUploadedRef.current = false;
    dispatch({ type: 'OPEN_SHEET', sheet: 'camera' });
  }, [dispatch]);

  const handleSheetDismiss = useCallback(() => {
    requestAnimationFrame(() => {
      dispatch({ type: 'RESOLVE_PENDING' });
    });
  }, [dispatch]);

  const handleCloseSheet = useCallback(
    (pendingSheet?: SheetId) => {
      if (pendingSheet) {
        dispatch({ type: 'CLOSE_SHEET', pendingSheet });
      } else {
        dispatch({ type: 'CLOSE_SHEET' });
      }
    },
    [dispatch]
  );

  const handlePhotoUploaded = useCallback(() => {
    logger.scan('Photo uploaded successfully');
    photoUploadedRef.current = true;
  }, []);

  const handleCameraClose = useCallback(() => {
    if (photoUploadedRef.current) {
      dispatch({ type: 'MARK_PHOTO_COMPLETED' });
    }
    photoUploadedRef.current = false;
    dispatch({ type: 'CLOSE_SHEET' });
  }, [dispatch]);

  // ── Review sheet handlers ──

  /** Camera captured a photo — close camera, open review sheet */
  const handlePhotoCaptured = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET', pendingSheet: 'review' });
  }, [dispatch]);

  /** Review: user confirmed upload — mark completed + close */
  const handleReviewConfirmed = useCallback(() => {
    logger.scan('Photo uploaded successfully');
    dispatch({ type: 'MARK_PHOTO_COMPLETED' });
    dispatch({ type: 'CLOSE_SHEET' });
  }, [dispatch]);

  /** Review: user wants to retake — close review, reopen camera */
  const handleReviewRetake = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET', pendingSheet: 'camera' });
  }, [dispatch]);

  /** Review: user closed without confirming */
  const handleReviewClose = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET' });
  }, [dispatch]);

  return {
    handlePhotoPress,
    handleSheetDismiss,
    handleCloseSheet,
    handlePhotoUploaded,
    handleCameraClose,
    handlePhotoCaptured,
    handleReviewConfirmed,
    handleReviewRetake,
    handleReviewClose,
  };
}
