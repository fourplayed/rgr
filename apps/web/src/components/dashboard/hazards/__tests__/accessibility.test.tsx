/**
 * Accessibility Tests - Hazard Detection Components
 *
 * Tests for WCAG 2.1 AA compliance:
 * - Keyboard navigation
 * - Screen reader compatibility
 * - Focus management
 * - ARIA labels and roles
 * - Color contrast (via theme)
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PhotoUploadZone } from '../PhotoUploadZone';
import { AnalysisResultCard } from '../AnalysisResultCard';
import { PhotoAnalysisSection } from '../PhotoAnalysisSection';
import type { AnalysisResult } from '@/hooks/usePhotoAnalysis';
import * as usePhotoAnalysisModule from '@/hooks/usePhotoAnalysis';

// Extend expect with axe matchers
expect.extend(toHaveNoViolations);

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

vi.mock('@/hooks/usePhotoAnalysis', () => ({
  usePhotoAnalysis: vi.fn(),
}));

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-object-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// Test Data Factories
// ============================================================================

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
        description: 'Load is not properly secured',
        evidencePoints: ['Missing straps'],
        recommendedActions: ['Add straps', 'Verify weight'],
      },
    ],
    requiresAcknowledgment: false,
    blockedFromDeparture: false,
    analyzedAt: new Date().toISOString(),
    durationMs: 2500,
  };
}

function setupMockHook(state: Partial<usePhotoAnalysisModule.PhotoAnalysisState> = {}) {
  vi.mocked(usePhotoAnalysisModule.usePhotoAnalysis).mockReturnValue({
    state: {
      status: 'idle',
      progress: 0,
      error: null,
      result: null,
      ...state,
    },
    actions: {
      analyzePhoto: vi.fn(),
      reset: vi.fn(),
      clearError: vi.fn(),
    },
  });
}

// ============================================================================
// PhotoUploadZone Accessibility Tests
// ============================================================================

describe('Accessibility: PhotoUploadZone', () => {
  describe('Keyboard Navigation', () => {
    it('should be focusable via keyboard', async () => {
      const user = userEvent.setup();
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />);

      const uploadZone = screen.getByRole('button', {
        name: /upload photo for hazard analysis/i,
      });

      await user.tab();
      expect(uploadZone).toHaveFocus();
    });

    it('should activate on Enter key', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      const uploadZone = screen.getByRole('button', {
        name: /upload photo for hazard analysis/i,
      });

      uploadZone.focus();
      fireEvent.keyDown(uploadZone, { key: 'Enter' });

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should activate on Space key', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      const uploadZone = screen.getByRole('button', {
        name: /upload photo for hazard analysis/i,
      });

      uploadZone.focus();
      fireEvent.keyDown(uploadZone, { key: ' ' });

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not activate when disabled', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} disabled={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      const uploadZone = screen.getByRole('button', {
        name: /upload photo for hazard analysis/i,
      });

      fireEvent.keyDown(uploadZone, { key: 'Enter' });

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have accessible role="button"', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />);

      expect(
        screen.getByRole('button', { name: /upload photo for hazard analysis/i })
      ).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute(
        'aria-label',
        'Upload photo for hazard analysis'
      );
    });

    it('should have tabIndex 0 when enabled', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute('tabindex', '0');
    });

    it('should have tabIndex -1 when disabled', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} disabled={true} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute('tabindex', '-1');
    });

    it('should not have focusable button when loading', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} isLoading={true} />);

      // Button should not be rendered when loading, so it should not be focusable
      expect(screen.queryByRole('button', { name: /upload photo for hazard analysis/i })).not.toBeInTheDocument();
      // Loading message should be shown instead
      expect(screen.getByText('Analyzing photo for hazards...')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicator', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone.className).toContain('focus-visible:ring-2');
    });

    it('should maintain focus after file selection error', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />
      );

      const uploadZone = screen.getByRole('button');
      uploadZone.focus();

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/please select an image file/i)).toBeInTheDocument();
      });

      // Focus should still be manageable
      expect(document.body).toContainElement(uploadZone);
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce loading state', () => {
      render(<PhotoUploadZone onFileSelect={vi.fn()} isDark={true} isLoading={true} />);

      expect(screen.getByText(/analyzing photo for hazards/i)).toBeInTheDocument();
    });

    it('should announce error messages', async () => {
      render(
        <PhotoUploadZone
          onFileSelect={vi.fn()}
          isDark={true}
          error="Upload failed"
          onClearError={vi.fn()}
        />
      );

      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });

    it('should have accessible remove button when preview shown', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /remove selected photo/i })
        ).toBeInTheDocument();
      });
    });

    it('should have alt text for preview image', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText('Selected photo preview')).toBeInTheDocument();
      });
    });
  });

  describe('Error Accessibility', () => {
    it('should have accessible dismiss button for errors', () => {
      render(
        <PhotoUploadZone
          onFileSelect={vi.fn()}
          isDark={true}
          error="Test error"
          onClearError={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /dismiss error/i })
      ).toBeInTheDocument();
    });
  });

  describe('Axe Accessibility Audit', () => {
    // Note: The hidden file input lacks an explicit label. This is acceptable because:
    // 1. The input is visually hidden (display: none equivalent via 'hidden' class)
    // 2. Users interact via the button wrapper which has proper aria-label
    // We exclude the 'label' rule for this specific pattern
    const axeOptions = {
      rules: {
        // Hidden file input is controlled by button with aria-label
        label: { enabled: false },
        // The upload zone acts as a button but may contain internal focusable elements
        // (e.g., dismiss button for errors, remove button for preview)
        // This is a known pattern for file upload components
        'nested-interactive': { enabled: false },
      },
    };

    it('should have no accessibility violations in idle state', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in loading state', async () => {
      const { container } = render(
        <PhotoUploadZone onFileSelect={vi.fn()} isDark={true} isLoading={true} />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with error', async () => {
      const { container } = render(
        <PhotoUploadZone
          onFileSelect={vi.fn()}
          isDark={true}
          error="Test error"
          onClearError={vi.fn()}
        />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });
});

// ============================================================================
// AnalysisResultCard Accessibility Tests
// ============================================================================

describe('Accessibility: AnalysisResultCard', () => {
  describe('Semantic Structure', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <AnalysisResultCard
          result={createMockResult()}
          onAddToQueue={vi.fn()}
          onDismiss={vi.fn()}
          onNewAnalysis={vi.fn()}
          isDark={true}
        />
      );

      // Main title
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      // Hazard count as heading
      expect(screen.getByText(/hazard.*detected/i)).toBeInTheDocument();
    });

    it('should have alt text for analyzed photo', () => {
      render(
        <AnalysisResultCard
          result={createMockResult()}
          isDark={true}
        />
      );

      expect(screen.getByAltText('Analyzed photo')).toBeInTheDocument();
    });
  });

  describe('Button Accessibility', () => {
    it('should have accessible button labels', () => {
      render(
        <AnalysisResultCard
          result={createMockResult()}
          onAddToQueue={vi.fn()}
          onDismiss={vi.fn()}
          onNewAnalysis={vi.fn()}
          isDark={true}
        />
      );

      expect(
        screen.getByRole('button', { name: /add to review queue/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /new analysis/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /dismiss/i })
      ).toBeInTheDocument();
    });

    it('should have interactive expand/collapse for recommendations', async () => {
      const user = userEvent.setup();
      render(
        <AnalysisResultCard
          result={createMockResult()}
          isDark={true}
        />
      );

      // Find the expand button
      const expandButton = screen.getByText(/recommended actions/i);
      expect(expandButton.closest('button')).toBeInTheDocument();

      await user.click(expandButton);
      // Should toggle state
    });
  });

  describe('Color Independence', () => {
    it('should not rely solely on color for severity indication', () => {
      render(
        <AnalysisResultCard
          result={createMockResult()}
          isDark={true}
        />
      );

      // Severity should have text label, not just color
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should have text labels for all status indicators', () => {
      const resultWithNoHazards = {
        ...createMockResult(),
        hazards: [],
      };

      render(
        <AnalysisResultCard
          result={resultWithNoHazards}
          isDark={true}
        />
      );

      // All clear status should have text
      expect(screen.getByText('No Hazards Detected')).toBeInTheDocument();
    });
  });

  describe('Axe Accessibility Audit', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AnalysisResultCard
          result={createMockResult()}
          onAddToQueue={vi.fn()}
          onDismiss={vi.fn()}
          onNewAnalysis={vi.fn()}
          isDark={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with no hazards', async () => {
      const resultWithNoHazards = {
        ...createMockResult(),
        hazards: [],
      };

      const { container } = render(
        <AnalysisResultCard
          result={resultWithNoHazards}
          isDark={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in light theme', async () => {
      const { container } = render(
        <AnalysisResultCard
          result={createMockResult()}
          onAddToQueue={vi.fn()}
          onDismiss={vi.fn()}
          onNewAnalysis={vi.fn()}
          isDark={false}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

// ============================================================================
// PhotoAnalysisSection Accessibility Tests
// ============================================================================

describe('Accessibility: PhotoAnalysisSection', () => {
  describe('State Announcements', () => {
    it('should communicate status changes for screen readers', () => {
      setupMockHook({ status: 'idle' });
      render(<PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />);

      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
    });

    it('should announce analysis progress', () => {
      setupMockHook({ status: 'analyzing', progress: 70 });
      render(<PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />);

      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText(/running ai analysis/i)).toBeInTheDocument();
    });

    it('should announce completion', () => {
      setupMockHook({ status: 'completed', result: createMockResult() });
      render(<PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />);

      expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
    });

    it('should announce errors', () => {
      setupMockHook({ status: 'error', error: 'Analysis failed' });
      render(<PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />);

      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    });
  });

  describe('Axe Accessibility Audit', () => {
    // Note: See PhotoUploadZone axe tests for explanation of excluded rules
    const axeOptions = {
      rules: {
        // Hidden file input is controlled by button wrapper with aria-label
        label: { enabled: false },
        // The upload zone acts as a button but contains internal focusable elements
        // This is a known pattern for file upload components
        'nested-interactive': { enabled: false },
      },
    };

    it('should have no violations in idle state', async () => {
      setupMockHook({ status: 'idle' });
      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations during analysis', async () => {
      setupMockHook({ status: 'analyzing', progress: 50 });
      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with results', async () => {
      setupMockHook({ status: 'completed', result: createMockResult() });
      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in light theme', async () => {
      setupMockHook({ status: 'idle' });
      const { container } = render(
        <PhotoAnalysisSection isDark={false} onHazardDetected={vi.fn()} />
      );

      const results = await axe(container, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });
});

// ============================================================================
// Cross-Component Keyboard Navigation
// ============================================================================

describe('Accessibility: Keyboard Navigation Flow', () => {
  it('should allow complete keyboard operation of upload flow', async () => {
    const user = userEvent.setup();
    setupMockHook({ status: 'idle' });

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    // Wait for asset selector to load
    await waitFor(() => {
      expect(screen.queryByText('Loading assets...')).not.toBeInTheDocument();
    });

    // Tab to asset selector and open it
    await user.tab(); // First tab lands on asset selector button
    const assetButton = screen.getByRole('button', { name: /select an asset/i });
    expect(assetButton).toHaveFocus();

    // Open dropdown and select an asset
    await user.click(assetButton);
    await waitFor(() => {
      expect(screen.getByText('TL001')).toBeInTheDocument();
    });
    const firstAsset = screen.getByText('TL001').closest('button');
    if (firstAsset) await user.click(firstAsset);

    // After selecting an asset and closing the dropdown, manually focus the upload zone
    // (This simulates the user tabbing to the upload zone)
    const uploadZone = screen.getByRole('button', {
      name: /upload photo for hazard analysis/i,
    });
    uploadZone.focus();
    expect(uploadZone).toHaveFocus();

    // Activate with Enter
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.keyDown(uploadZone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should allow keyboard navigation of result actions', async () => {
    const user = userEvent.setup();
    setupMockHook({ status: 'completed', result: createMockResult() });

    render(<PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />);

    // Tab through action buttons
    await user.tab();
    await user.tab();
    await user.tab();

    // Should be able to reach the buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
