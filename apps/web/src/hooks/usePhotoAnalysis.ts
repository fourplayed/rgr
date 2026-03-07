/**
 * usePhotoAnalysis - Hook for managing photo upload and hazard analysis
 * Handles file upload to Supabase storage and triggers AI analysis
 *
 * Features:
 * - Upload photo to Supabase storage
 * - Trigger analyze-freight edge function
 * - Track analysis status and progress
 * - Return detected hazards with confidence scores
 * - Error handling with retry capability
 */
import { useState, useCallback, useMemo } from 'react';
import { getSupabaseClient, createPhotoRecord } from '@rgr/shared';
import { useAuthStore } from '@/stores/authStore';
import type { HazardSeverity } from '../components/dashboard/hazards';

// ============================================================================
// Types
// ============================================================================

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';

export interface DetectedHazard {
  id: string;
  hazardType: string;
  severity: HazardSeverity;
  confidence: number;
  description: string;
  locationInImage?: string;
  evidencePoints: string[];
  recommendedActions: string[];
}

export interface FreightInfo {
  primaryCategory: string;
  secondaryCategories: string[];
  description: string;
  confidence: number;
  estimatedWeightKg?: number;
  loadDistributionScore?: number;
  restraintCount?: number;
}

export interface AnalysisResult {
  analysisId: string;
  photoId: string;
  photoUrl: string;
  freight: FreightInfo;
  hazards: DetectedHazard[];
  requiresAcknowledgment: boolean;
  blockedFromDeparture: boolean;
  analyzedAt: string;
  durationMs: number;
}

export interface PhotoAnalysisState {
  status: AnalysisStatus;
  progress: number; // 0-100
  error: string | null;
  result: AnalysisResult | null;
}

export interface UsePhotoAnalysisResult {
  state: PhotoAnalysisState;
  actions: {
    analyzePhoto: (file: File, assetId?: string) => Promise<void>;
    reset: () => void;
    clearError: () => void;
  };
}

// ============================================================================
// Constants
// ============================================================================

const BUCKET_COMPRESSED = 'photos-compressed';
const BUCKET_ORIGINAL = 'photos-original';

/**
 * Magic bytes for common image file formats.
 * Used to validate that file content matches declared MIME type.
 */
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xff, 0xd8, 0xff], // JPEG/JFIF
  ],
  'image/png': [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (first 4 bytes, WEBP at offset 8-11)
  ],
  'image/bmp': [
    [0x42, 0x4d], // BM
  ],
};

/**
 * Allowed MIME types for photo uploads
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate file content by checking magic bytes against declared MIME type.
 * This prevents attackers from uploading malicious files with fake extensions.
 * @param file - The file to validate
 * @returns validation result with valid flag, detected type, and error message
 */
async function validateImageContent(
  file: File
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  // Check declared MIME type first
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed. Please upload a JPEG, PNG, GIF, WebP, or BMP image.`,
    };
  }

  // Read the first 12 bytes to check magic bytes
  const headerSize = 12;
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check if magic bytes match any known image format
  for (const [mimeType, signatures] of Object.entries(IMAGE_MAGIC_BYTES)) {
    for (const signature of signatures) {
      if (signature.every((byte, index) => bytes[index] === byte)) {
        // Special check for WebP: verify 'WEBP' at offset 8-11
        if (mimeType === 'image/webp') {
          const webpMarker = [0x57, 0x45, 0x42, 0x50]; // 'WEBP'
          if (!webpMarker.every((byte, index) => bytes[8 + index] === byte)) {
            continue; // Not a valid WebP
          }
        }
        return { valid: true, detectedType: mimeType };
      }
    }
  }

  // If we reach here, the file content doesn't match any known image format
  return {
    valid: false,
    error:
      'File content does not match a valid image format. The file may be corrupted or not a genuine image.',
  };
}

/**
 * Compress image before upload using canvas
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Create canvas and draw
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate unique file path for storage
 */
function generateFilePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${userId}/${timestamp}-${randomStr}.${ext}`;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePhotoAnalysis(): UsePhotoAnalysisResult {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Analyze photo
  const analyzePhoto = useCallback(
    async (file: File, assetId?: string) => {
      setStatus('uploading');
      setProgress(5);
      setError(null);
      setResult(null);

      const startTime = Date.now();

      try {
        // Validate file content (magic bytes) before proceeding
        const validation = await validateImageContent(file);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid file type');
        }

        setProgress(10);

        if (!user) {
          throw new Error('Please sign in to analyze photos');
        }
        const supabase = getSupabaseClient();

        setProgress(20);

        // Compress image for upload
        let compressedBlob: Blob;
        try {
          compressedBlob = await compressImage(file);
        } catch {
          // If compression fails, use original file
          compressedBlob = file;
        }

        setProgress(30);

        // Generate storage path
        const storagePath = generateFilePath(user.id, file.name);

        // Upload compressed and original images in parallel for better performance
        // Only fail if compressed upload fails (original is optional for quality reference)
        const uploadPromises = [
          // Compressed upload - required
          supabase.storage.from(BUCKET_COMPRESSED).upload(storagePath, compressedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          }),
          // Original upload - optional (for quality reference)
          supabase.storage.from(BUCKET_ORIGINAL).upload(storagePath, file, {
            contentType: file.type,
            cacheControl: '3600',
          }),
        ];

        const results = await Promise.allSettled(uploadPromises);
        const compressedResult = results[0];
        const originalResult = results[1];

        // Check compressed upload result - this is required
        if (!compressedResult || compressedResult.status === 'rejected') {
          console.error('Compressed upload error:', compressedResult?.reason);
          throw new Error('Failed to upload photo. Please try again.');
        }

        // Check if compressed upload had a Supabase error
        const compressedData = compressedResult.value;
        if (compressedData.error) {
          console.error('Compressed upload error:', compressedData.error);
          throw new Error('Failed to upload photo. Please try again.');
        }

        // Original upload is optional - log warning if it failed but don't throw
        if (!originalResult || originalResult.status === 'rejected') {
          console.warn('Original photo upload failed (non-critical):', originalResult?.reason);
        } else if (originalResult.value.error) {
          console.warn('Original photo upload failed (non-critical):', originalResult.value.error);
        }

        setProgress(60);

        // Create photo record in database via shared service
        const photoResult = await createPhotoRecord({
          assetId: assetId || null,
          uploadedBy: user.id,
          photoType: 'freight',
          storagePath,
          thumbnailPath: storagePath,
          filename: file.name,
          fileSize: compressedBlob.size,
        });

        if (!photoResult.success) {
          console.error('Photo record error:', photoResult.error);
          throw new Error(
            'Failed to save photo record. Please select an asset first or contact support.'
          );
        }

        const photoRecord = photoResult.data;

        setProgress(70);
        setStatus('analyzing');

        // Call analyze-freight edge function
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'analyze-freight',
          {
            body: {
              photoId: photoRecord.id,
              forceReanalyze: false,
            },
          }
        );

        if (analysisError) {
          console.error('Analysis error:', analysisError);
          // Check for specific error types
          const errorMessage = analysisError.message || analysisError.context?.body?.error || '';
          if (errorMessage.toLowerCase().includes('unauthorized')) {
            throw new Error('Session expired. Please sign in again to analyze photos.');
          }
          throw new Error('AI analysis failed. Please try again.');
        }

        setProgress(90);

        // Get public URL for the photo
        const { data: urlData } = supabase.storage
          .from(BUCKET_COMPRESSED)
          .getPublicUrl(storagePath);

        const photoUrl = urlData?.publicUrl || '';

        // Map response to our format
        const analysisResult: AnalysisResult = {
          analysisId: analysisData.analysisId,
          photoId: photoRecord.id,
          photoUrl,
          freight: {
            primaryCategory: formatCategoryName(analysisData.result?.primaryCategory || 'unknown'),
            secondaryCategories: (analysisData.result?.secondaryCategories || []).map(
              formatCategoryName
            ),
            description: analysisData.result?.description || 'No description available',
            confidence: Math.round((analysisData.result?.confidence || 0) * 100),
            ...(analysisData.result?.estimatedWeightKg != null
              ? { estimatedWeightKg: analysisData.result.estimatedWeightKg }
              : {}),
            ...(analysisData.result?.loadDistributionScore != null
              ? {
                  loadDistributionScore: Math.round(
                    analysisData.result.loadDistributionScore * 100
                  ),
                }
              : {}),
            ...(analysisData.result?.restraintCount != null
              ? { restraintCount: analysisData.result.restraintCount }
              : {}),
          },
          hazards: (analysisData.hazardAlerts || []).map(
            (
              alert: {
                alertId: string;
                hazardType: string;
                severity: string;
                description: string;
                recommendedActions: string[];
              },
              index: number
            ) => ({
              id: alert.alertId || `hazard-${index}`,
              hazardType: formatHazardType(alert.hazardType),
              severity: alert.severity as HazardSeverity,
              confidence: analysisData.result?.detectedHazards?.[index]?.confidence
                ? Math.round(analysisData.result.detectedHazards[index].confidence * 100)
                : 75, // Default confidence if not available
              description: alert.description,
              locationInImage: analysisData.result?.detectedHazards?.[index]?.locationInImage,
              evidencePoints: analysisData.result?.detectedHazards?.[index]?.evidencePoints || [],
              recommendedActions: alert.recommendedActions || [],
            })
          ),
          requiresAcknowledgment: analysisData.requiresAcknowledgment || false,
          blockedFromDeparture: analysisData.blockedFromDeparture || false,
          analyzedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };

        setProgress(100);
        setResult(analysisResult);
        setStatus('completed');
      } catch (err) {
        console.error('Photo analysis error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setStatus('error');
      }
    },
    [user]
  );

  // Reset state
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  // Memoize state
  const state = useMemo<PhotoAnalysisState>(
    () => ({
      status,
      progress,
      error,
      result,
    }),
    [status, progress, error, result]
  );

  // Memoize actions
  const actions = useMemo(
    () => ({
      analyzePhoto,
      reset,
      clearError,
    }),
    [analyzePhoto, reset, clearError]
  );

  return { state, actions };
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatHazardType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default usePhotoAnalysis;
