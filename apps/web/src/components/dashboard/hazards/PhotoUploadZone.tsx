/**
 * PhotoUploadZone - Drag-and-drop photo upload component for hazard analysis
 * Vision UI glassmorphism design with dark/light theme support
 *
 * Features:
 * - Drag-and-drop file upload
 * - Click to select file
 * - Image preview with remove option
 * - File type validation (images only)
 * - Size validation (max 10MB)
 * - Loading state during upload/analysis
 * - Error handling with retry
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { RGR_COLORS } from '@/styles/color-palette';

// ============================================================================
// Types
// ============================================================================

export interface PhotoUploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
  onClearError?: () => void;
  className?: string;
  isDark?: boolean;
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// ============================================================================
// Component
// ============================================================================

export const PhotoUploadZone = React.memo<PhotoUploadZoneProps>(({
  onFileSelect,
  isLoading = false,
  error = null,
  onClearError,
  className = '',
  isDark = true,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount or when preview changes to prevent memory leak
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Theme colors
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please select an image file (JPEG, PNG, WebP, or HEIC)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }
    return null;
  }, []);

  // Handle file selection
  const handleFileSelection = useCallback((file: File) => {
    const validationResult = validateFile(file);
    if (validationResult) {
      setValidationError(validationResult);
      return;
    }

    setValidationError(null);
    onClearError?.();
    setSelectedFile(file);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Notify parent
    onFileSelect(file);
  }, [validateFile, onFileSelect, onClearError]);

  // Clear selection
  const clearSelection = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setValidationError(null);
    onClearError?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [preview, onClearError]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  }, [disabled, isLoading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isLoading) return;

    const files = e.dataTransfer.files;
    const firstFile = files[0];
    if (files.length > 0 && firstFile) {
      handleFileSelection(firstFile);
    }
  }, [disabled, isLoading, handleFileSelection]);

  // File input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleFileSelection(firstFile);
    }
  }, [handleFileSelection]);

  // Click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && !isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isLoading]);

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || isLoading) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }, [disabled, isLoading]);

  // Background styles
  const getBgStyle = () => {
    if (isDragging) {
      return isDark
        ? { background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' }
        : { background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' };
    }
    return isDark
      ? {
          background: 'linear-gradient(to bottom, rgba(0, 0, 40, 0.6) 0%, rgba(10, 38, 84, 0.6) 100%)',
          borderColor: `${RGR_COLORS.chrome.light}33`,
        }
      : {
          background: 'linear-gradient(to bottom, rgba(209, 213, 219, 0.6) 0%, rgba(243, 244, 246, 0.6) 100%)',
          borderColor: 'rgba(107, 114, 128, 0.5)',
        };
  };

  const displayError = validationError || error;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-200
          ${disabled || isLoading ? 'opacity-50' : ''}
          ${isDragging ? 'scale-[1.02]' : ''}
        `}
        style={{
          ...getBgStyle(),
          minHeight: preview ? '200px' : '160px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isLoading}
          tabIndex={-1}
        />

        {/* Preview Mode */}
        {preview && !isLoading && (
          <div className="relative w-full h-full min-h-[200px]">
            <img
              src={preview}
              alt="Selected photo preview"
              className="w-full h-full object-contain rounded-lg"
              style={{ maxHeight: '200px' }}
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: '#ffffff',
              }}
              aria-label="Remove selected photo"
            >
              <X className="w-4 h-4" />
            </button>
            {/* File name */}
            <div
              className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg text-sm truncate"
              style={{
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                color: textPrimary,
              }}
            >
              {selectedFile?.name}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)' }}
            >
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#3b82f6' }} />
            </div>
            <p className="text-base font-medium" style={{ color: textPrimary }}>
              Analyzing photo for hazards...
            </p>
            <p className="text-sm mt-1" style={{ color: textMuted }}>
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Default Upload State */}
        {!preview && !isLoading && (
          <button
            type="button"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            tabIndex={disabled || isLoading ? -1 : 0}
            className={`
              w-full flex flex-col items-center justify-center py-8 px-4
              ${disabled || isLoading ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-xl
            `}
            aria-label="Upload photo for hazard analysis"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform duration-200"
              style={{
                backgroundColor: isDragging
                  ? 'rgba(59, 130, 246, 0.25)'
                  : isDark
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(59, 130, 246, 0.1)',
                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {isDragging ? (
                <ImageIcon className="w-7 h-7" style={{ color: '#3b82f6' }} />
              ) : (
                <Upload className="w-7 h-7" style={{ color: '#3b82f6' }} />
              )}
            </div>
            <p className="text-base font-medium" style={{ color: textPrimary }}>
              {isDragging ? 'Drop photo here' : 'Upload photo for hazard analysis'}
            </p>
            <p className="text-sm mt-1" style={{ color: textMuted }}>
              Drag and drop or click to select
            </p>
            <p className="text-xs mt-2" style={{ color: textMuted }}>
              JPEG, PNG, WebP, HEIC (max 10MB)
            </p>
          </button>
        )}
      </div>

      {/* Error Display */}
      {displayError && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: '#ef4444' }}>
              {displayError}
            </p>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setValidationError(null);
                onClearError();
              }}
              className="flex-shrink-0 p-0.5 rounded hover:bg-red-500/20 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

PhotoUploadZone.displayName = 'PhotoUploadZone';

export default PhotoUploadZone;
