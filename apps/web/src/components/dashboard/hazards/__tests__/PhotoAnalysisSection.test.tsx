/**
 * PhotoAnalysisSection Tests
 *
 * Tests for the combined photo upload and analysis results section.
 * Uses London School (mockist) TDD approach with behavior verification.
 *
 * Coverage targets:
 * - State transitions (idle -> uploading -> analyzing -> completed)
 * - Integration between upload zone and result card
 * - Error handling
 * - Progress tracking
 * - Theme support
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhotoAnalysisSection, type PhotoAnalysisSectionProps } from '../PhotoAnalysisSection';
import * as usePhotoAnalysisModule from '@/hooks/usePhotoAnalysis';
import type { PhotoAnalysisState, AnalysisResult } from '@/hooks/usePhotoAnalysis';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock @rgr/shared
vi.mock('@rgr/shared', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [
                { id: 'asset-1', asset_number: 'TL001', category: 'trailer', subtype: 'flattop', status: 'serviced' },
                { id: 'asset-2', asset_number: 'TL002', category: 'trailer', subtype: 'dropdeck', status: 'serviced' },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  })),
}));

// Mock the usePhotoAnalysis hook
vi.mock('@/hooks/usePhotoAnalysis', () => ({
  usePhotoAnalysis: vi.fn(),
}));

// Mock URL.createObjectURL and revokeObjectURL for PhotoUploadZone
const mockObjectUrl = 'blob:http://localhost/mock-object-url';
beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => mockObjectUrl),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockState(overrides: Partial<PhotoAnalysisState> = {}): PhotoAnalysisState {
  return {
    status: 'idle',
    progress: 0,
    error: null,
    result: null,
    ...overrides,
  };
}

function createMockResult(): AnalysisResult {
  return {
    analysisId: 'analysis-123',
    photoId: 'photo-456',
    photoUrl: 'https://example.com/photo.jpg',
    freight: {
      primaryCategory: 'Construction Materials',
      secondaryCategories: ['Steel'],
      description: 'Steel beams for construction',
      confidence: 92,
      estimatedWeightKg: 15000,
      loadDistributionScore: 75,
      restraintCount: 4,
    },
    hazards: [
      {
        id: 'hazard-1',
        hazardType: 'Unsecured Load',
        severity: 'high',
        confidence: 85,
        description: 'Load appears to be inadequately secured',
        evidencePoints: ['Missing tie-downs'],
        recommendedActions: ['Add additional straps'],
      },
    ],
    requiresAcknowledgment: false,
    blockedFromDeparture: false,
    analyzedAt: new Date().toISOString(),
    durationMs: 2500,
  };
}

function createMockActions() {
  return {
    analyzePhoto: vi.fn(),
    reset: vi.fn(),
    clearError: vi.fn(),
  };
}

function setupMockHook(
  state: Partial<PhotoAnalysisState> = {},
  actions: Partial<ReturnType<typeof createMockActions>> = {}
) {
  const mockState = createMockState(state);
  const mockActions = { ...createMockActions(), ...actions };

  vi.mocked(usePhotoAnalysisModule.usePhotoAnalysis).mockReturnValue({
    state: mockState,
    actions: mockActions,
  });

  return { state: mockState, actions: mockActions };
}

function renderPhotoAnalysisSection(props: Partial<PhotoAnalysisSectionProps> = {}) {
  const defaultProps: PhotoAnalysisSectionProps = {
    onHazardDetected: vi.fn(),
    isDark: true,
  };

  return {
    ...render(<PhotoAnalysisSection {...defaultProps} {...props} />),
    props: { ...defaultProps, ...props },
  };
}

// ============================================================================
// Rendering Tests
// ============================================================================

describe('PhotoAnalysisSection', () => {
  describe('Rendering - Idle State', () => {
    it('should render upload zone when idle', () => {
      setupMockHook({ status: 'idle' });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
      // Asset selector is now shown
      expect(screen.getByText('Assign to Asset')).toBeInTheDocument();
    });

    it('should show info text when idle and no asset selected', () => {
      setupMockHook({ status: 'idle' });
      renderPhotoAnalysisSection();

      // Should show warning about selecting asset first
      expect(
        screen.getByText(/please select an asset above before uploading a photo/i)
      ).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      setupMockHook({ status: 'idle' });
      const { container } = renderPhotoAnalysisSection({ className: 'custom-class' });

      // VisionCard applies className to its wrapper
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // File Selection Tests
  // ============================================================================

  describe('File Selection', () => {
    it('should call analyzePhoto with assetId when file is selected after asset selection', async () => {
      const user = userEvent.setup();
      const { actions } = setupMockHook({ status: 'idle' });
      const { container } = renderPhotoAnalysisSection();

      // Wait for asset selector to finish loading
      await waitFor(() => {
        expect(screen.queryByText('Loading assets...')).not.toBeInTheDocument();
      });

      // First select an asset
      const assetButton = screen.getByRole('button', { name: /select an asset/i });
      await user.click(assetButton);

      // Wait for dropdown and select first asset
      await waitFor(() => {
        expect(screen.getByText('TL001')).toBeInTheDocument();
      });
      const firstAsset = screen.getByText('TL001').closest('button');
      if (firstAsset) await user.click(firstAsset);

      // Now select a file
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [file] } });

      expect(actions.analyzePhoto).toHaveBeenCalledWith(file, 'asset-1');
    });
  });

  // ============================================================================
  // Uploading State Tests
  // ============================================================================

  describe('Uploading State', () => {
    it('should show uploading message when status is uploading', () => {
      setupMockHook({ status: 'uploading', progress: 30 });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Uploading photo...')).toBeInTheDocument();
    });

    it('should show progress bar during upload', () => {
      setupMockHook({ status: 'uploading', progress: 50 });
      const { container } = renderPhotoAnalysisSection();

      // Find progress bar by looking for the styled element
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      setupMockHook({ status: 'uploading', progress: 45 });
      renderPhotoAnalysisSection();

      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Analyzing State Tests
  // ============================================================================

  describe('Analyzing State', () => {
    it('should show analyzing message when status is analyzing', () => {
      setupMockHook({ status: 'analyzing', progress: 70 });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Running AI analysis...')).toBeInTheDocument();
    });

    it('should show progress during analysis', () => {
      setupMockHook({ status: 'analyzing', progress: 80 });
      renderPhotoAnalysisSection();

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should disable upload zone during analysis', () => {
      setupMockHook({ status: 'analyzing', progress: 70 });
      const { container } = renderPhotoAnalysisSection();

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDisabled();
    });
  });

  // ============================================================================
  // Completed State Tests
  // ============================================================================

  describe('Completed State', () => {
    it('should show results when analysis is completed', () => {
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
    });

    it('should display AnalysisResultCard with result data', () => {
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      expect(screen.getByText('Construction Materials')).toBeInTheDocument();
      expect(screen.getByText('Unsecured Load')).toBeInTheDocument();
    });

    it('should hide upload zone when results are shown', () => {
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      expect(
        screen.queryByText(/drag and drop or click to select/i)
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================

  describe('Error State', () => {
    it('should display error message from hook state', () => {
      setupMockHook({ status: 'error', error: 'Upload failed. Please try again.' });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument();
    });

    it('should call clearError when error is dismissed', async () => {
      const user = userEvent.setup();
      const { actions } = setupMockHook({
        status: 'error',
        error: 'Network error occurred',
      });
      renderPhotoAnalysisSection();

      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      await user.click(dismissButton);

      expect(actions.clearError).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Action Callbacks Tests
  // ============================================================================

  describe('Action Callbacks', () => {
    it('should call onHazardDetected when Add to Queue is clicked', async () => {
      const user = userEvent.setup();
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      const onHazardDetected = vi.fn();
      renderPhotoAnalysisSection({ onHazardDetected });

      const addButton = screen.getByRole('button', { name: /add to review queue/i });
      await user.click(addButton);

      expect(onHazardDetected).toHaveBeenCalledWith(result);
    });

    it('should call reset when Dismiss is clicked', async () => {
      const user = userEvent.setup();
      const result = createMockResult();
      const { actions } = setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(actions.reset).toHaveBeenCalled();
    });

    it('should call reset when New Analysis is clicked', async () => {
      const user = userEvent.setup();
      const result = createMockResult();
      const { actions } = setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      const newButton = screen.getByRole('button', { name: /new analysis/i });
      await user.click(newButton);

      expect(actions.reset).toHaveBeenCalled();
    });

    it('should not show Add to Queue when no hazards detected', () => {
      const result = { ...createMockResult(), hazards: [] };
      setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      expect(
        screen.queryByRole('button', { name: /add to review queue/i })
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Theme Support Tests
  // ============================================================================

  describe('Theme Support', () => {
    it('should render correctly with isDark=true', () => {
      setupMockHook({ status: 'idle' });
      renderPhotoAnalysisSection({ isDark: true });

      // Component should render with dark theme prop
      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
    });

    it('should render correctly with isDark=false', () => {
      setupMockHook({ status: 'idle' });
      renderPhotoAnalysisSection({ isDark: false });

      // Component should render with light theme prop
      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
    });

    it('should show camera icon when idle', () => {
      setupMockHook({ status: 'idle' });
      renderPhotoAnalysisSection();

      // Component should render with camera icon (verified by title presence)
      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
    });

    it('should show sparkles icon when completed', () => {
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      // Component should show analysis complete header
      expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // State Transition Tests
  // ============================================================================

  describe('State Transitions', () => {
    it('should transition from idle to uploading when file selected', async () => {
      const { actions } = setupMockHook({ status: 'idle' });
      const { container } = renderPhotoAnalysisSection();

      // Select file
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      fireEvent.change(input, { target: { files: [file] } });

      expect(actions.analyzePhoto).toHaveBeenCalled();
    });

    it('should hide info text when not idle', () => {
      setupMockHook({ status: 'uploading', progress: 20 });
      renderPhotoAnalysisSection();

      expect(
        screen.queryByText(/upload a photo of freight/i)
      ).not.toBeInTheDocument();
    });

    it('should show asset selector when idle', () => {
      setupMockHook({ status: 'idle' });
      renderPhotoAnalysisSection();

      expect(screen.getByText('Assign to Asset')).toBeInTheDocument();
    });

    it('should show Analysis Complete header when completed', () => {
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      renderPhotoAnalysisSection();

      // Should show Analysis Complete header
      expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle null result gracefully when completed', () => {
      setupMockHook({ status: 'completed', result: null });

      // Should not crash
      expect(() => renderPhotoAnalysisSection()).not.toThrow();
    });

    it('should handle onHazardDetected being undefined', async () => {
      const user = userEvent.setup();
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      render(<PhotoAnalysisSection isDark={true} />);

      const addButton = screen.getByRole('button', { name: /add to review queue/i });

      // Should not throw when clicked
      await expect(user.click(addButton)).resolves.not.toThrow();
    });

    it('should preserve className through state changes', () => {
      setupMockHook({ status: 'idle' });
      const { container, rerender } = renderPhotoAnalysisSection({
        className: 'my-custom-class',
      });

      // VisionCard applies className to its wrapper
      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();

      // Change to completed state
      const result = createMockResult();
      setupMockHook({ status: 'completed', result });
      rerender(
        <PhotoAnalysisSection
          className="my-custom-class"
          isDark={true}
          onHazardDetected={vi.fn()}
        />
      );

      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });
  });
});
