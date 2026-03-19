import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { onlineManager } from '@tanstack/react-query';
import { usePhotoCaptureStore } from '../store/photoCaptureStore';
import { useUploadPhoto } from './usePhotos';
import { useAuthStore } from '../store/authStore';
import { MAX_PHOTO_SIZE_BYTES } from '@rgr/shared';
import type { PhotoType } from '@rgr/shared';
import { generateThumbnail } from '../utils/imageUtils';
import { logger } from '../utils/logger';
import { enqueueMutation, copyPhotoToOfflineStorage } from '../utils/offlineMutationQueue';

export type UploadStep = 'validating' | 'thumbnail' | 'uploading' | 'complete' | null;

/**
 * Hook for managing photo capture workflow.
 * Handles taking photos, preview state, and upload.
 */
export function usePhotoCapture() {
  const user = useAuthStore((s) => s.user);
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
    patch,
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
  // Step-level progress for upload overlay
  const [uploadStep, setUploadStep] = useState<UploadStep>(null);
  // Track thumbnail URI so we can clean up the file on retake/cancel
  const thumbnailUriRef = useRef<string | null>(null);

  // Clean up thumbnail file on unmount (only if no upload is in progress)
  useEffect(
    () => () => {
      if (thumbnailUriRef.current && !isUploadingRef.current) {
        FileSystem.deleteAsync(thumbnailUriRef.current, { idempotent: true }).catch(() => {});
      }
    },
    []
  );

  /**
   * Take a photo using the provided camera ref.
   * Returns the captured photo URI or null if capture failed.
   */
  const takePhoto = useCallback(
    async (cameraRef: React.RefObject<CameraView>): Promise<string | null> => {
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
          patch({ capturedUri: photo.uri });
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
    },
    [patch, setImageDimensions]
  );

  /**
   * Clear the captured photo and return to camera view.
   */
  const retakePhoto = useCallback(async () => {
    // Clean up orphaned thumbnail file from previous capture
    if (thumbnailUriRef.current) {
      FileSystem.deleteAsync(thumbnailUriRef.current, { idempotent: true }).catch(() => {});
      thumbnailUriRef.current = null;
    }
    patch({ capturedUri: null, uploadError: null });
    setUploadStep(null);
  }, [patch]);

  /**
   * Upload the captured photo.
   * Returns true on success, false on failure.
   */
  const confirmAndUpload = useCallback(
    async (photoType: PhotoType = 'freight'): Promise<boolean> => {
      if (isUploadingRef.current) return false;
      if (!capturedUri || !assetId || !user) {
        patch({ uploadError: 'Missing required data for upload' });
        return false;
      }

      try {
        isUploadingRef.current = true;
        patch({ isUploading: true, uploadError: null });
        setUploadStep('validating');

        // Pre-check file existence and size before uploading
        const fileInfo = await FileSystem.getInfoAsync(capturedUri, { size: true });
        if (!fileInfo.exists) {
          patch({
            uploadError: 'Photo file not found. Please try taking the photo again.',
            isUploading: false,
          });
          setUploadStep(null);
          return false;
        }
        if (fileInfo.size !== undefined && fileInfo.size > MAX_PHOTO_SIZE_BYTES) {
          patch({
            uploadError: `Photo is too large (max ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB). Please retake the photo.`,
            isUploading: false,
          });
          setUploadStep(null);
          return false;
        }

        // Offline path: persist photo locally and enqueue for later replay
        if (!onlineManager.isOnline()) {
          const userId = useAuthStore.getState().user?.id;
          if (!userId) throw new Error('Not authenticated');
          const mutationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const persistentUri = await copyPhotoToOfflineStorage(capturedUri, mutationId);
          await enqueueMutation({
            type: 'photo',
            payload: {
              assetId,
              scanEventId: scanEventId ?? null,
              localUri: persistentUri,
              photoType,
              uploadedBy: userId,
              mimeType: 'image/jpeg',
              originalFilename: `${mutationId}.jpg`,
              latitude: latitude ?? null,
              longitude: longitude ?? null,
            },
          });
          setUploadStep('complete');
          reset();
          return true;
        }

        setUploadStep('thumbnail');

        // Generate thumbnail before upload
        let thumbnailFileUri: string | undefined;
        if (imageWidth && imageHeight) {
          try {
            const thumbnail = await generateThumbnail(capturedUri);
            thumbnailFileUri = thumbnail.uri;
            thumbnailUriRef.current = thumbnail.uri;
          } catch (thumbError: unknown) {
            logger.warn('Failed to generate thumbnail', thumbError);
            // Continue without thumbnail
          }
        }

        setUploadStep('uploading');

        const uploadOptions: Parameters<typeof uploadPhotoMutation>[0] = {
          assetId,
          scanEventId,
          uploadedBy: user.id,
          photoType,
          fileUri: capturedUri,
          mimeType: 'image/jpeg',
          locationDescription,
          latitude,
          longitude,
        };
        if (imageWidth != null) uploadOptions.width = imageWidth;
        if (imageHeight != null) uploadOptions.height = imageHeight;
        if (thumbnailFileUri) uploadOptions.thumbnailFileUri = thumbnailFileUri;

        await uploadPhotoMutation(uploadOptions);

        // Success — show complete step, then reset capture state
        setUploadStep('complete');
        reset();
        return true;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to upload photo';
        patch({ uploadError: message });
        setUploadStep(null);
        // Clean up orphaned thumbnail file on upload failure
        if (thumbnailUriRef.current) {
          FileSystem.deleteAsync(thumbnailUriRef.current, { idempotent: true }).catch(() => {});
          thumbnailUriRef.current = null;
        }
        return false;
      } finally {
        isUploadingRef.current = false;
        patch({ isUploading: false });
      }
    },
    [
      capturedUri,
      assetId,
      scanEventId,
      locationDescription,
      latitude,
      longitude,
      imageWidth,
      imageHeight,
      user,
      uploadPhotoMutation,
      patch,
      reset,
    ]
  );

  /**
   * Cancel the capture workflow.
   */
  const cancelCapture = useCallback(() => {
    // Clean up orphaned thumbnail file
    if (thumbnailUriRef.current) {
      FileSystem.deleteAsync(thumbnailUriRef.current, { idempotent: true }).catch(() => {});
      thumbnailUriRef.current = null;
    }
    setUploadStep(null);
    reset();
  }, [reset]);

  return {
    // State
    capturedUri,
    assetId,
    scanEventId,
    isUploading,
    uploadError,
    uploadStep,
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
