/**
 * PhotoAnalysisSection - Combined photo upload and analysis results section
 * Vision UI glassmorphism design with dark/light theme support
 *
 * Features:
 * - Photo upload zone with drag-and-drop
 * - Asset selector to associate photos with fleet assets
 * - Analysis results display
 * - Progress indicator during analysis
 * - Error handling with retry
 * - State management via usePhotoAnalysis hook
 */
import React, { useCallback, useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { VisionCard } from '../vision/VisionCard';
import { PhotoUploadZone } from './PhotoUploadZone';
import { AnalysisResultCard } from './AnalysisResultCard';
import { AssetSelector } from './AssetSelector';
import { usePhotoAnalysis, type AnalysisResult } from '@/hooks/usePhotoAnalysis';
import { RGR_COLORS } from '@/styles/color-palette';

// ============================================================================
// Types
// ============================================================================

export interface PhotoAnalysisSectionProps {
  onHazardDetected?: (result: AnalysisResult) => void;
  className?: string;
  isDark?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PhotoAnalysisSection = React.memo<PhotoAnalysisSectionProps>(({
  onHazardDetected,
  className = '',
  isDark = true,
}) => {
  const { state, actions } = usePhotoAnalysis();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  const borderColor = isDark
    ? `${RGR_COLORS.chrome.medium}33`
    : 'rgba(107, 114, 128, 0.75)';

  const headerBg = isDark ? '#060b28' : '#e5e7eb';

  // Handle file selection - pass selected asset ID for association
  const handleFileSelect = useCallback((file: File) => {
    actions.analyzePhoto(file, selectedAssetId || undefined);
  }, [actions, selectedAssetId]);

  // Handle add to queue
  const handleAddToQueue = useCallback((result: AnalysisResult) => {
    onHazardDetected?.(result);
    // Could show a toast notification here
  }, [onHazardDetected]);

  // Handle dismiss - reset to upload state
  const handleDismiss = useCallback(() => {
    actions.reset();
  }, [actions]);

  // Handle new analysis
  const handleNewAnalysis = useCallback(() => {
    actions.reset();
  }, [actions]);

  // Determine if we should show the upload zone or results
  const showResults = state.status === 'completed' && state.result;
  const isAnalyzing = state.status === 'uploading' || state.status === 'analyzing';

  return (
    <VisionCard className={className} isDark={isDark} noPadding>
      {/* Card Header */}
      <div
        className="p-4 border-b flex-shrink-0"
        style={{ borderColor, background: headerBg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showResults ? (
              <Sparkles className="w-5 h-5" style={{ color: '#f59e0b' }} />
            ) : (
              <Camera className="w-5 h-5" style={{ color: isDark ? '#ffffff' : '#000000' }} />
            )}
            <h3 className="text-lg font-medium" style={{ color: textPrimary }}>
              {showResults ? 'Analysis Complete' : 'Analyze New Photo'}
            </h3>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Show upload zone when idle or analyzing */}
        {!showResults && (
          <div className="space-y-4">
            {/* Asset Selector - Required for associating photo with asset */}
            <AssetSelector
              value={selectedAssetId}
              onChange={setSelectedAssetId}
              isDark={isDark}
              disabled={isAnalyzing}
            />

            <PhotoUploadZone
              onFileSelect={handleFileSelect}
              isLoading={isAnalyzing}
              error={state.error}
              onClearError={actions.clearError}
              isDark={isDark}
              disabled={isAnalyzing || !selectedAssetId}
            />

            {/* Progress indicator */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: textMuted }}>
                    {state.status === 'uploading' ? 'Uploading photo...' : 'Running AI analysis...'}
                  </span>
                  <span style={{ color: textPrimary }}>{state.progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-black/20">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${state.progress}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Info text */}
            {state.status === 'idle' && (
              <div
                className="text-center py-2 text-sm"
                style={{ color: textMuted }}
              >
                {!selectedAssetId ? (
                  <p style={{ color: '#f59e0b' }}>
                    Please select an asset above before uploading a photo.
                  </p>
                ) : (
                  <p>
                    Upload a photo of freight or cargo to analyze it for potential safety hazards.
                    The AI will identify load types, assess restraints, and detect any issues.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Show results when analysis is complete */}
        {showResults && state.result && (
          <AnalysisResultCard
            result={state.result}
            onAddToQueue={state.result.hazards.length > 0 ? handleAddToQueue : undefined}
            onDismiss={handleDismiss}
            onNewAnalysis={handleNewAnalysis}
            isDark={isDark}
          />
        )}
      </div>
    </VisionCard>
  );
});

PhotoAnalysisSection.displayName = 'PhotoAnalysisSection';

export default PhotoAnalysisSection;
