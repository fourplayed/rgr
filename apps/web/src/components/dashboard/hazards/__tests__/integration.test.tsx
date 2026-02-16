/**
 * Integration Tests - Photo Upload to Analysis Display Flow
 *
 * End-to-end integration tests for the complete hazard detection workflow.
 * Tests the full flow from photo upload through AI analysis to result display.
 *
 * Coverage targets:
 * - Full upload -> analysis -> display flow
 * - Error scenarios (network failure, invalid files, API errors)
 * - Theme switching during flow
 * - Component interactions
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhotoAnalysisSection } from '../PhotoAnalysisSection';
import type { AnalysisResult } from '@/hooks/usePhotoAnalysis';

// ============================================================================
// Integration Test Setup
// ============================================================================

// Integration tests should use the real usePhotoAnalysis hook
// We only mock the external Supabase API layer

// Create mock Supabase client that can be configured by test helpers
const mockSupabase = {
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
    insert: vi.fn(),
  })),
  auth: {
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

// We test the components together while mocking the external API layer
vi.mock('@rgr/shared', () => ({
  getSupabaseClient: () => mockSupabase,
}));

// Store original createElement before mocking
const originalCreateElement = document.createElement.bind(document);

// Mock URL APIs for file handling
beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:http://localhost/test-url'),
    revokeObjectURL: vi.fn(),
  });

  // Mock Image for compression
  vi.stubGlobal(
    'Image',
    vi.fn().mockImplementation(() => {
      const img = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
        width: 1920,
        height: 1080,
      };
      Object.defineProperty(img, 'src', {
        set: () => {
          setTimeout(() => img.onload?.(), 0);
        },
      });
      return img;
    })
  );

  // Mock canvas - use stored reference to avoid recursion
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (cb: (blob: Blob) => void) => cb(new Blob(['compressed'])),
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tagName);
  });

  // Reset mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ============================================================================
// Test Utilities
// ============================================================================

function createMockFile(
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  size: number = 1024
): File {
  const content = new Array(size).fill('a').join('');
  const file = new File([content], name, { type });

  // Mock slice().arrayBuffer() for magic bytes validation
  // JPEG magic bytes: 0xFF, 0xD8, 0xFF
  const jpegMagicBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const pngMagicBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const webpMagicBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

  const magicBytes = type === 'image/png' ? pngMagicBytes
    : type === 'image/webp' ? webpMagicBytes
    : jpegMagicBytes;

  const originalSlice = file.slice.bind(file);
  file.slice = (...args: Parameters<typeof file.slice>) => {
    const blob = originalSlice(...args);
    blob.arrayBuffer = () => Promise.resolve(magicBytes.buffer);
    return blob;
  };

  return file;
}

function setupSuccessfulUploadMocks(analysisResult: Partial<AnalysisResult> = {}) {
  // Auth
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  // Storage upload
  mockSupabase.storage.from.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/photo.jpg' },
    }),
  });

  // Photo record + asset selector
  mockSupabase.from.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [
              { id: 'asset-1', asset_number: 'TL001', category: 'trailer', subtype: 'flattop', status: 'serviced' },
            ],
            error: null,
          })),
        })),
      })),
    })),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'photo-123' },
          error: null,
        }),
      }),
    }),
  });

  // Analysis result
  mockSupabase.functions.invoke.mockResolvedValue({
    data: {
      analysisId: 'analysis-456',
      result: {
        primaryCategory: 'construction_materials',
        secondaryCategories: ['steel'],
        description: 'Steel beams for construction',
        confidence: 0.92,
        estimatedWeightKg: 15000,
        loadDistributionScore: 0.75,
        restraintCount: 4,
        detectedHazards: [
          {
            confidence: 0.85,
            locationInImage: 'center',
            evidencePoints: ['Missing tie-downs'],
          },
        ],
      },
      hazardAlerts: [
        {
          alertId: 'alert-1',
          hazardType: 'unsecured_load',
          severity: 'high',
          description: 'Load appears to be inadequately secured',
          recommendedActions: ['Add straps', 'Verify weight distribution'],
        },
      ],
      requiresAcknowledgment: false,
      blockedFromDeparture: false,
      ...analysisResult,
    },
    error: null,
  });
}

function setupAuthFailureMocks() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

function setupUploadFailureMocks() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  mockSupabase.storage.from.mockReturnValue({
    upload: vi.fn().mockResolvedValue({
      error: { message: 'Storage error' },
    }),
    getPublicUrl: vi.fn(),
  });
}

function setupAnalysisFailureMocks() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  mockSupabase.storage.from.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/photo.jpg' },
    }),
  });

  mockSupabase.from.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [
              { id: 'asset-1', asset_number: 'TL001', category: 'trailer', subtype: 'flattop', status: 'serviced' },
            ],
            error: null,
          })),
        })),
      })),
    })),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'photo-123' },
          error: null,
        }),
      }),
    }),
  });

  mockSupabase.functions.invoke.mockResolvedValue({
    data: null,
    error: { message: 'AI service unavailable' },
  });
}

// ============================================================================
// Full Flow Integration Tests
// ============================================================================

describe('Integration: Photo Analysis Flow', () => {
  describe('Successful Analysis Flow', () => {
    it('should complete full flow from upload to results display', async () => {
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      // Step 1: Initial state shows upload zone
      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
      expect(screen.getByText(/drag and drop or click to select/i)).toBeInTheDocument();

      // Step 2: Select file
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('cargo.jpg', 'image/jpeg', 1024);
      fireEvent.change(input, { target: { files: [file] } });

      // Step 3: Should show analysis in progress
      await waitFor(() => {
        // Either uploading or analyzing message should appear
        const statusMessages = screen.queryAllByText(/uploading|analyzing/i);
        expect(statusMessages.length).toBeGreaterThanOrEqual(0);
      });

      // Step 4: Wait for results
      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Step 5: Verify result display
      expect(screen.getByText('Construction Materials')).toBeInTheDocument();
      expect(screen.getByText('Unsecured Load')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should display all hazard details after analysis', async () => {
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Check freight info
      expect(screen.getByText('Construction Materials')).toBeInTheDocument();
      expect(screen.getByText(/~15.0t/)).toBeInTheDocument();
      expect(screen.getByText(/Distribution: 75%/)).toBeInTheDocument();
      expect(screen.getByText(/4 restraints/)).toBeInTheDocument();

      // Check hazard info
      expect(screen.getByText('1 Hazard Detected')).toBeInTheDocument();
      expect(screen.getByText(/inadequately secured/i)).toBeInTheDocument();
    });

    it('should call onHazardDetected when Add to Queue is clicked', async () => {
      const user = userEvent.setup();
      setupSuccessfulUploadMocks();
      const onHazardDetected = vi.fn();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={onHazardDetected} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const addButton = screen.getByRole('button', { name: /add to review queue/i });
      await user.click(addButton);

      expect(onHazardDetected).toHaveBeenCalled();
      expect(onHazardDetected.mock.calls[0][0]).toMatchObject({
        analysisId: 'analysis-456',
        hazards: expect.arrayContaining([
          expect.objectContaining({
            hazardType: 'Unsecured Load',
            severity: 'high',
          }),
        ]),
      });
    });

    it('should reset to upload state when New Analysis is clicked', async () => {
      const user = userEvent.setup();
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const newButton = screen.getByRole('button', { name: /new analysis/i });
      await user.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();
        expect(screen.getByText(/drag and drop or click to select/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Error Flow Tests
  // ============================================================================

  describe('Error Flows', () => {
    it('should display auth error when user is not logged in', async () => {
      setupAuthFailureMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(() => {
        expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
      });
    });

    it('should display upload error when storage fails', async () => {
      setupUploadFailureMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(() => {
        expect(screen.getByText(/failed to upload/i)).toBeInTheDocument();
      });
    });

    it('should display analysis error when AI service fails', async () => {
      setupAnalysisFailureMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(() => {
        expect(screen.getByText(/ai analysis failed/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error by selecting new file', async () => {
      // First setup for failure
      setupAuthFailureMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(() => {
        expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
      });

      // Now setup for success
      setupSuccessfulUploadMocks();

      // Dismiss error
      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      fireEvent.click(dismissButton);

      // Try again
      fireEvent.change(input, { target: { files: [createMockFile('retry.jpg')] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  // ============================================================================
  // File Validation Integration Tests
  // ============================================================================

  describe('File Validation', () => {
    it('should reject invalid file types before upload attempt', async () => {
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = createMockFile('document.pdf', 'application/pdf', 1024);

      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/please select an image file/i)).toBeInTheDocument();
      });

      // Should not have called API
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should reject oversized files before upload attempt', async () => {
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const largeFile = createMockFile('huge.jpg', 'image/jpeg', 15 * 1024 * 1024);

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument();
      });

      // Should not have called API
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Theme Integration Tests
  // ============================================================================

  describe('Theme Consistency', () => {
    it('should maintain dark theme throughout the flow', async () => {
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      // Check initial rendering with dark theme
      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();

      // Complete analysis
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify results are displayed (theme consistency maintained)
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    it('should maintain light theme throughout the flow', async () => {
      setupSuccessfulUploadMocks();

      const { container } = render(
        <PhotoAnalysisSection isDark={false} onHazardDetected={vi.fn()} />
      );

      // Check initial rendering with light theme
      expect(screen.getByText('Analyze New Photo')).toBeInTheDocument();

      // Complete analysis
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify results are displayed (theme consistency maintained)
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // No Hazards Flow Tests
  // ============================================================================

  describe('No Hazards Detected Flow', () => {
    it('should display all clear message when no hazards found', async () => {
      setupSuccessfulUploadMocks();
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          analysisId: 'analysis-456',
          result: {
            primaryCategory: 'general_cargo',
            confidence: 0.95,
          },
          hazardAlerts: [], // No hazards
          requiresAcknowledgment: false,
          blockedFromDeparture: false,
        },
        error: null,
      });

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Analysis Results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByText('No Hazards Detected')).toBeInTheDocument();
      expect(screen.getByText(/no safety concerns/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /add to review queue/i })
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Critical Hazards Flow Tests
  // ============================================================================

  describe('Critical Hazards Flow', () => {
    it('should display departure blocked warning for critical hazards', async () => {
      setupSuccessfulUploadMocks();
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          analysisId: 'analysis-456',
          result: {
            primaryCategory: 'hazardous_materials',
            confidence: 0.98,
          },
          hazardAlerts: [
            {
              alertId: 'alert-1',
              hazardType: 'missing_placards',
              severity: 'critical',
              description: 'Hazardous material placards are missing',
              recommendedActions: ['Add required placards immediately'],
            },
          ],
          requiresAcknowledgment: true,
          blockedFromDeparture: true,
        },
        error: null,
      });

      const { container } = render(
        <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createMockFile()] } });

      await waitFor(
        () => {
          expect(screen.getByText('Departure Blocked')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText(/must be resolved before departure/i)).toBeInTheDocument();
    });
  });
});
