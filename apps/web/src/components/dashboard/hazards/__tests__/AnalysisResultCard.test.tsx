/**
 * AnalysisResultCard Tests
 *
 * Tests for displaying AI hazard analysis results.
 * Uses London School (mockist) TDD approach with behavior verification.
 *
 * Coverage targets:
 * - Result display
 * - Hazard rendering with severity badges
 * - Action buttons
 * - Expandable recommended actions
 * - Theme support
 * - Edge cases (no hazards, many hazards)
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AnalysisResultCard, type AnalysisResultCardProps } from '../AnalysisResultCard';
import type { AnalysisResult, DetectedHazard, FreightInfo } from '@/hooks/usePhotoAnalysis';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock hazard for testing
 */
function createMockHazard(overrides: Partial<DetectedHazard> = {}): DetectedHazard {
  return {
    id: 'hazard-1',
    hazardType: 'Unsecured Load',
    severity: 'high',
    confidence: 85,
    description: 'Load appears to be inadequately secured with visible movement risk',
    locationInImage: 'center',
    evidencePoints: ['Missing tie-downs', 'Load shift visible'],
    recommendedActions: [
      'Add additional straps',
      'Re-secure load before departure',
      'Verify weight distribution',
    ],
    ...overrides,
  };
}

/**
 * Create mock freight info
 */
function createMockFreightInfo(overrides: Partial<FreightInfo> = {}): FreightInfo {
  return {
    primaryCategory: 'Construction Materials',
    secondaryCategories: ['Steel', 'Building Supplies'],
    description: 'Steel beams and structural materials for construction',
    confidence: 92,
    estimatedWeightKg: 15000,
    loadDistributionScore: 75,
    restraintCount: 4,
    ...overrides,
  };
}

/**
 * Create a mock analysis result for testing
 */
function createMockResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: 'analysis-123',
    photoId: 'photo-456',
    photoUrl: 'https://example.com/photo.jpg',
    freight: createMockFreightInfo(),
    hazards: [createMockHazard()],
    requiresAcknowledgment: false,
    blockedFromDeparture: false,
    analyzedAt: new Date().toISOString(),
    durationMs: 2500,
    ...overrides,
  };
}

/**
 * Render AnalysisResultCard with default props
 */
function renderAnalysisResultCard(props: Partial<AnalysisResultCardProps> = {}) {
  const defaultProps: AnalysisResultCardProps = {
    result: createMockResult(),
    onAddToQueue: vi.fn(),
    onDismiss: vi.fn(),
    onNewAnalysis: vi.fn(),
    isDark: true,
  };

  return {
    ...render(<AnalysisResultCard {...defaultProps} {...props} />),
    props: { ...defaultProps, ...props },
  };
}

// ============================================================================
// Rendering Tests
// ============================================================================

describe('AnalysisResultCard', () => {
  describe('Rendering', () => {
    it('should render analysis results header', () => {
      renderAnalysisResultCard();

      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    it('should display analysis duration', () => {
      renderAnalysisResultCard({
        result: createMockResult({ durationMs: 2500 }),
      });

      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });

    it('should display photo thumbnail', () => {
      const photoUrl = 'https://example.com/test-photo.jpg';
      renderAnalysisResultCard({
        result: createMockResult({ photoUrl }),
      });

      const image = screen.getByAltText('Analyzed photo');
      expect(image).toHaveAttribute('src', photoUrl);
    });

    it('should display freight category', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ primaryCategory: 'Machinery' }),
        }),
      });

      expect(screen.getByText('Machinery')).toBeInTheDocument();
    });

    it('should display freight description', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ description: 'Heavy industrial equipment' }),
        }),
      });

      expect(screen.getByText('Heavy industrial equipment')).toBeInTheDocument();
    });

    it('should display freight confidence score', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ confidence: 95 }),
        }),
      });

      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderAnalysisResultCard({ className: 'custom-class' });

      // VisionCard wraps content with className prop
      // The custom class is applied to the VisionCard wrapper
      const cardElement = container.querySelector('.custom-class');
      expect(cardElement).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Freight Metrics Tests
  // ============================================================================

  describe('Freight Metrics', () => {
    it('should display estimated weight in tonnes', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ estimatedWeightKg: 25000 }),
        }),
      });

      expect(screen.getByText(/~25.0t/)).toBeInTheDocument();
    });

    it('should display load distribution score', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ loadDistributionScore: 80 }),
        }),
      });

      expect(screen.getByText(/Distribution: 80%/)).toBeInTheDocument();
    });

    it('should display restraint count', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ restraintCount: 6 }),
        }),
      });

      expect(screen.getByText(/6 restraints/)).toBeInTheDocument();
    });

    it('should not display metrics that are undefined', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({
            estimatedWeightKg: undefined,
            loadDistributionScore: undefined,
            restraintCount: undefined,
          }),
        }),
      });

      expect(screen.queryByText(/~.*t/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Distribution:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/restraints/)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Hazard Display Tests
  // ============================================================================

  describe('Hazard Display', () => {
    it('should display hazard count header', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard(), createMockHazard({ id: 'hazard-2' })],
        }),
      });

      expect(screen.getByText('2 Hazards Detected')).toBeInTheDocument();
    });

    it('should use singular "Hazard" for single hazard', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard()],
        }),
      });

      expect(screen.getByText('1 Hazard Detected')).toBeInTheDocument();
    });

    it('should display hazard type', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ hazardType: 'Overweight Load' })],
        }),
      });

      expect(screen.getByText('Overweight Load')).toBeInTheDocument();
    });

    it('should display hazard description', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ description: 'Load exceeds safe limits' })],
        }),
      });

      expect(screen.getByText('Load exceeds safe limits')).toBeInTheDocument();
    });

    it('should display hazard confidence with progress bar', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ confidence: 78 })],
        }),
      });

      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Severity Badge Tests
  // ============================================================================

  describe('Severity Badges', () => {
    it('should display critical severity badge', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ severity: 'critical' })],
        }),
      });

      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should display high severity badge', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ severity: 'high' })],
        }),
      });

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should display medium severity badge', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ severity: 'medium' })],
        }),
      });

      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should display low severity badge', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ severity: 'low' })],
        }),
      });

      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should display severity summary pills for multiple hazards', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({ id: 'h1', severity: 'critical' }),
            createMockHazard({ id: 'h2', severity: 'critical' }),
            createMockHazard({ id: 'h3', severity: 'high' }),
            createMockHazard({ id: 'h4', severity: 'medium' }),
          ],
        }),
      });

      expect(screen.getByText('2 Crit')).toBeInTheDocument();
      expect(screen.getByText('1 High')).toBeInTheDocument();
      expect(screen.getByText('1 Med')).toBeInTheDocument();
    });

    it('should display hazard count badge on photo thumbnail', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({ id: 'h1' }),
            createMockHazard({ id: 'h2' }),
            createMockHazard({ id: 'h3' }),
          ],
        }),
      });

      // Find the thumbnail container and check for badge
      const thumbnailContainer = screen.getByAltText('Analyzed photo').parentElement;
      expect(within(thumbnailContainer!).getByText('3')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Departure Blocking Tests
  // ============================================================================

  describe('Departure Blocking', () => {
    it('should display departure blocked warning when critical hazards exist', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          blockedFromDeparture: true,
          hazards: [createMockHazard({ severity: 'critical' })],
        }),
      });

      expect(screen.getByText('Departure Blocked')).toBeInTheDocument();
      expect(
        screen.getByText(/critical hazards detected.*must be resolved/i)
      ).toBeInTheDocument();
    });

    it('should not display departure blocked warning when not blocked', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          blockedFromDeparture: false,
          hazards: [createMockHazard({ severity: 'medium' })],
        }),
      });

      expect(screen.queryByText('Departure Blocked')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // No Hazards Tests
  // ============================================================================

  describe('No Hazards (All Clear)', () => {
    it('should display all clear message when no hazards detected', () => {
      renderAnalysisResultCard({
        result: createMockResult({ hazards: [] }),
      });

      expect(screen.getByText('No Hazards Detected')).toBeInTheDocument();
    });

    it('should display success message for safe load', () => {
      renderAnalysisResultCard({
        result: createMockResult({ hazards: [] }),
      });

      expect(
        screen.getByText(/AI analysis found no safety concerns/i)
      ).toBeInTheDocument();
    });

    it('should not show Add to Queue button when no hazards', () => {
      renderAnalysisResultCard({
        result: createMockResult({ hazards: [] }),
      });

      expect(
        screen.queryByRole('button', { name: /add to review queue/i })
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Recommended Actions Tests
  // ============================================================================

  describe('Recommended Actions', () => {
    it('should show expand button for recommended actions', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({
              recommendedActions: ['Action 1', 'Action 2'],
            }),
          ],
        }),
      });

      expect(screen.getByText(/Recommended Actions \(2\)/)).toBeInTheDocument();
    });

    it('should expand to show recommended actions when clicked', async () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({
              recommendedActions: ['Check straps', 'Verify weight'],
            }),
          ],
        }),
      });

      // First hazard should be expanded by default
      expect(screen.getByText('Check straps')).toBeInTheDocument();
      expect(screen.getByText('Verify weight')).toBeInTheDocument();
    });

    it('should collapse recommended actions when clicked twice', async () => {
      const user = userEvent.setup();
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({
              recommendedActions: ['Check straps', 'Verify weight'],
            }),
          ],
        }),
      });

      // Click to collapse (first item is expanded by default)
      const expandButton = screen.getByText(/Hide.*Recommended Actions/i);
      await user.click(expandButton);

      // Actions should now be hidden
      expect(screen.getByText(/Show.*Recommended Actions/i)).toBeInTheDocument();
    });

    it('should not show expand button when no recommended actions', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ recommendedActions: [] })],
        }),
      });

      expect(screen.queryByText(/Recommended Actions/)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Action Buttons Tests
  // ============================================================================

  describe('Action Buttons', () => {
    it('should call onAddToQueue when Add to Queue is clicked', async () => {
      const user = userEvent.setup();
      const onAddToQueue = vi.fn();
      const result = createMockResult();

      renderAnalysisResultCard({ result, onAddToQueue });

      const addButton = screen.getByRole('button', { name: /add to review queue/i });
      await user.click(addButton);

      expect(onAddToQueue).toHaveBeenCalledWith(result);
    });

    it('should call onNewAnalysis when New Analysis is clicked', async () => {
      const user = userEvent.setup();
      const onNewAnalysis = vi.fn();

      renderAnalysisResultCard({ onNewAnalysis });

      const newButton = screen.getByRole('button', { name: /new analysis/i });
      await user.click(newButton);

      expect(onNewAnalysis).toHaveBeenCalled();
    });

    it('should call onDismiss when Dismiss is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      renderAnalysisResultCard({ onDismiss });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should not render buttons when callbacks are not provided', () => {
      renderAnalysisResultCard({
        onAddToQueue: undefined,
        onDismiss: undefined,
        onNewAnalysis: undefined,
      });

      expect(screen.queryByRole('button', { name: /add to review queue/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /new analysis/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('should show red Add to Queue button for critical/high severity', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ severity: 'critical' })],
        }),
      });

      const addButton = screen.getByRole('button', { name: /add to review queue/i });
      expect(addButton.style.backgroundColor).toBe('rgb(239, 68, 68)'); // #ef4444
    });

    it('should show amber Add to Queue button for medium/low severity', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ severity: 'medium' })],
        }),
      });

      const addButton = screen.getByRole('button', { name: /add to review queue/i });
      expect(addButton.style.backgroundColor).toBe('rgb(245, 158, 11)'); // #f59e0b
    });
  });

  // ============================================================================
  // Theme Support Tests
  // ============================================================================

  describe('Theme Support', () => {
    it('should render correctly in dark theme', () => {
      renderAnalysisResultCard({ isDark: true });

      // Component should render with dark theme prop
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    it('should render correctly in light theme', () => {
      renderAnalysisResultCard({ isDark: false });

      // Component should render with light theme prop
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Multiple Hazards Tests
  // ============================================================================

  describe('Multiple Hazards', () => {
    it('should render all hazards in a list', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({ id: 'h1', hazardType: 'Unsecured Load' }),
            createMockHazard({ id: 'h2', hazardType: 'Overweight' }),
            createMockHazard({ id: 'h3', hazardType: 'Improper Stacking' }),
          ],
        }),
      });

      expect(screen.getByText('Unsecured Load')).toBeInTheDocument();
      expect(screen.getByText('Overweight')).toBeInTheDocument();
      expect(screen.getByText('Improper Stacking')).toBeInTheDocument();
    });

    it('should have scrollable container for many hazards', () => {
      const manyHazards = Array.from({ length: 10 }, (_, i) =>
        createMockHazard({ id: `hazard-${i}`, hazardType: `Hazard ${i + 1}` })
      );

      const { container } = renderAnalysisResultCard({
        result: createMockResult({ hazards: manyHazards }),
      });

      // Find the hazard list container
      const hazardList = container.querySelector('.max-h-\\[300px\\]');
      expect(hazardList).toHaveClass('overflow-y-auto');
    });

    it('should expand first hazard by default', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [
            createMockHazard({
              id: 'h1',
              recommendedActions: ['First action'],
            }),
            createMockHazard({
              id: 'h2',
              recommendedActions: ['Second action'],
            }),
          ],
        }),
      });

      // First hazard should show its actions
      expect(screen.getByText('First action')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long hazard descriptions', () => {
      const longDescription = 'A'.repeat(500);
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ description: longDescription })],
        }),
      });

      // Should be truncated with line-clamp
      const description = screen.getByText(longDescription);
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should handle empty freight description', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          freight: createMockFreightInfo({ description: '' }),
        }),
      });

      // Should still render without crashing
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    it('should handle zero confidence scores', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ confidence: 0 })],
          freight: createMockFreightInfo({ confidence: 0 }),
        }),
      });

      // Should display 0%
      const percentages = screen.getAllByText('0%');
      expect(percentages.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle 100% confidence scores', () => {
      renderAnalysisResultCard({
        result: createMockResult({
          hazards: [createMockHazard({ confidence: 100 })],
        }),
      });

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle very fast analysis duration', () => {
      renderAnalysisResultCard({
        result: createMockResult({ durationMs: 100 }),
      });

      expect(screen.getByText('0.1s')).toBeInTheDocument();
    });

    it('should handle slow analysis duration', () => {
      renderAnalysisResultCard({
        result: createMockResult({ durationMs: 15000 }),
      });

      expect(screen.getByText('15.0s')).toBeInTheDocument();
    });
  });
});
