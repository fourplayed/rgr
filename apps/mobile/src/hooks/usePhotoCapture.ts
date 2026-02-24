import { useCallback, useRef } from 'react';
import type { CameraView } from 'expo-camera';
import { usePhotoCaptureStore } from '../store/photoCaptureStore';
import { useUploadPhoto } from './usePhotos';
import { useAuthStore } from '../store/authStore';

/**
 * Hook for managing photo capture workflow.
 * Handles taking photos, preview state, and upload.
 */
export function usePhotoCapture() {
  const { user } = useAuthStore();
  const {
    capturedUri,
    assetId,
    scanEventId,
    locationDescription,
    isUploading,
    uploadError,
    setCapturedUri,
    setIsUploading,
    setUploadError,
    startCapture,
    reset,
  } = usePhotoCaptureStore();

  const { mutateAsync: uploadPhotoMutation } = useUploadPhoto();
  const isCapturingRef = useRef(false);

  /**
   * Take a photo using the provided camera ref.
   * Returns the captured photo URI or null if capture failed.
   */
  const takePhoto = useCallback(async (
    cameraRef: React.RefObject<CameraView>
  ): Promise<string | null> => {
    if (!cameraRef.current || isCapturingRef.current) {
      return null;
    }

    try {
      isCapturingRef.current = true;

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        return photo.uri;
      }

      return null;
    } catch (error) {
      console.error('Failed to take photo:', error);
      return null;
    } finally {
      isCapturingRef.current = false;
    }
  }, [setCapturedUri]);

  /**
   * Clear the captured photo and return to camera view.
   */
  const retakePhoto = useCallback(() => {
    setCapturedUri(null);
    setUploadError(null);
  }, [setCapturedUri, setUploadError]);

  /**
   * Upload the captured photo.
   * Returns true on success, false on failure.
   */
  const confirmAndUpload = useCallback(async (
    photoType: string = 'freight'
  ): Promise<boolean> => {
    if (!capturedUri || !assetId || !user) {
      setUploadError('Missing required data for upload');
      return false;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      await uploadPhotoMutation({
        assetId,
        scanEventId,
        uploadedBy: user.id,
        photoType,
        fileUri: capturedUri,
        mimeType: 'image/jpeg',
        locationDescription,
      });

      // Success - reset the capture state
      reset();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo';
      setUploadError(message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [capturedUri, assetId, scanEventId, locationDescription, user, uploadPhotoMutation, setIsUploading, setUploadError, reset]);

  /**
   * Cancel the capture workflow.
   */
  const cancelCapture = useCallback(() => {
    reset();
  }, [reset]);

  return {
    // State
    capturedUri,
    assetId,
    scanEventId,
    isUploading,
    uploadError,
    isCapturing: isCapturingRef.current,

    // Actions
    takePhoto,
    retakePhoto,
    confirmAndUpload,
    startCapture,
    cancelCapture,
    reset,
  };
}
