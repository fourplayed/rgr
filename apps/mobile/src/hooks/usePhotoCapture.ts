import { useCallback, useRef, useState } from 'react';
import type { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { usePhotoCaptureStore } from '../store/photoCaptureStore';
import { useUploadPhoto } from './usePhotos';
import { useAuthStore } from '../store/authStore';
import { MAX_PHOTO_SIZE_BYTES } from '@rgr/shared';
import type { PhotoType } from '@rgr/shared';
import { generateThumbnail } from '../utils/imageUtils';
import { logger } from '../utils/logger';

/**
 * Hook for managing photo capture workflow.
 * Handles taking photos, preview state, and upload.
 */
export function usePhotoCapture() {
  const user = useAuthStore(s => s.user);
  const {
    capturedUri,
    assetId,
    scanEventId,
    locationDescription,
    latitude,
    longitude,
    isUploading,
    uploadError,
    imageWidth,
    imageHeight,
    setCapturedUri,
    setIsUploading,
    setUploadError,
    setImageDimensions,
    startCapture,
    reset,
  } = usePhotoCaptureStore();

  const { mutateAsync: uploadPhotoMutation } = useUploadPhoto();
  // Dual ref + state pattern for isCapturing:
  // - ref: guards against double-invocation (synchronous check in takePhoto)
  // - state: drives UI updates (e.g., disabling capture button)
  // Both are updated together to stay in sync.
  const isCapturingRef = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);
  // Guard against double-upload (same pattern as isCapturingRef)
  const isUploadingRef = useRef(false);

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
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        if (photo.width && photo.height) {
          setImageDimensions(photo.width, photo.height);
        }
        return photo.uri;
      }

      return null;
    } catch (error: unknown) {
      logger.error('Failed to take photo', error);
      return null;
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, [setCapturedUri, setImageDimensions]);

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
    photoType: PhotoType = 'freight'
  ): Promise<boolean> => {
    if (isUploadingRef.current) return false;
    if (!capturedUri || !assetId || !user) {
      setUploadError('Missing required data for upload');
      return false;
    }

    try {
      isUploadingRef.current = true;
      setIsUploading(true);
      setUploadError(null);

      // Pre-check file existence and size before uploading
      const fileInfo = await FileSystem.getInfoAsync(capturedUri, { size: true });
      if (!fileInfo.exists) {
        setUploadError('Photo file not found. Please try taking the photo again.');
        setIsUploading(false);
        return false;
      }
      if (fileInfo.size !== undefined && fileInfo.size > MAX_PHOTO_SIZE_BYTES) {
        setUploadError(`Photo is too large (max ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB). Please retake the photo.`);
        setIsUploading(false);
        return false;
      }

      // Generate thumbnail before upload
      let thumbnailFileUri: string | undefined;
      if (imageWidth && imageHeight) {
        try {
          const thumbnail = await generateThumbnail(capturedUri);
          thumbnailFileUri = thumbnail.uri;
        } catch (thumbError: unknown) {
          logger.warn('Failed to generate thumbnail', thumbError);
          // Continue without thumbnail
        }
      }

      await uploadPhotoMutation({
        assetId,
        scanEventId,
        uploadedBy: user.id,
        photoType,
        fileUri: capturedUri,
        mimeType: 'image/jpeg',
        locationDescription,
        latitude,
        longitude,
        ...(imageWidth != null && { width: imageWidth }),
        ...(imageHeight != null && { height: imageHeight }),
        ...(thumbnailFileUri && { thumbnailFileUri }),
      });

      // Success - reset the capture state
      reset();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo';
      setUploadError(message);
      return false;
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  }, [capturedUri, assetId, scanEventId, locationDescription, latitude, longitude, imageWidth, imageHeight, user, uploadPhotoMutation, setIsUploading, setUploadError, reset]);

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
    isCapturing,

    // Actions
    takePhoto,
    retakePhoto,
    confirmAndUpload,
    startCapture,
    cancelCapture,
    reset,
  };
}
