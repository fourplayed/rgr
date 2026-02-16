/**
 * usePhotoAnalysis Hook Tests
 *
 * Tests for the photo upload and hazard analysis hook.
 * Uses London School (mockist) TDD approach with behavior verification.
 *
 * Coverage targets:
 * - Upload flow
 * - Progress tracking
 * - Error handling
 * - API integration
 * - State management
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhotoAnalysis } from '../usePhotoAnalysis';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock @rgr/shared getSupabase
const mockSupabaseAuth = {
  getUser: vi.fn(),
};

const mockSupabaseStorage = {
  from: vi.fn(),
};

const mockSupabaseFunctions = {
  invoke: vi.fn(),
};

const mockSupabase = {
  auth: mockSupabaseAuth,
  storage: mockSupabaseStorage,
  functions: mockSupabaseFunctions,
  from: vi.fn(),
};

vi.mock('@rgr/shared', () => ({
  getSupabase: () => mockSupabase,
  getSupabaseClient: () => mockSupabase,
}));

// Mock Image for compression
const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
  width: 1920,
  height: 1080,
};

// Mock canvas for image compression
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
    callback(new Blob(['compressed'], { type: 'image/jpeg' }));
  }),
};

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Setup Image mock
  vi.stubGlobal(
    'Image',
    vi.fn().mockImplementation(() => {
      const img = { ...mockImage };
      // Trigger onload after src is set
      Object.defineProperty(img, 'src', {
        set: () => {
          setTimeout(() => img.onload?.(), 0);
        },
      });
      return img;
    })
  );

  // Setup document.createElement mock for canvas
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tagName);
  });

  // Setup URL mocks
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });

  // Default mock implementations
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  mockSupabaseStorage.from.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/photo.jpg' },
    }),
  });

  mockSupabase.from.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'photo-123' },
          error: null,
        }),
      }),
    }),
  });

  mockSupabaseFunctions.invoke.mockResolvedValue({
    data: {
      analysisId: 'analysis-456',
      result: {
        primaryCategory: 'machinery',
        secondaryCategories: ['industrial'],
        description: 'Industrial machinery',
        confidence: 0.92,
        estimatedWeightKg: 5000,
        loadDistributionScore: 0.85,
        restraintCount: 4,
        detectedHazards: [
          {
            confidence: 0.88,
            locationInImage: 'center',
            evidencePoints: ['Evidence 1'],
          },
        ],
      },
      hazardAlerts: [
        {
          alertId: 'alert-1',
          hazardType: 'unsecured_load',
          severity: 'high',
          description: 'Load is not properly secured',
          recommendedActions: ['Add straps', 'Check weight'],
        },
      ],
      requiresAcknowledgment: false,
      blockedFromDeparture: false,
    },
    error: null,
  });
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
  const originalSlice = file.slice.bind(file);
  file.slice = (...args: Parameters<typeof file.slice>) => {
    const blob = originalSlice(...args);
    blob.arrayBuffer = () => Promise.resolve(jpegMagicBytes.buffer);
    return blob;
  };

  return file;
}

// ============================================================================
// Initial State Tests
// ============================================================================

describe('usePhotoAnalysis', () => {
  describe('Initial State', () => {
    it('should initialize with idle status', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(result.current.state.status).toBe('idle');
    });

    it('should initialize with zero progress', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(result.current.state.progress).toBe(0);
    });

    it('should initialize with null error', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(result.current.state.error).toBeNull();
    });

    it('should initialize with null result', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(result.current.state.result).toBeNull();
    });

    it('should provide analyzePhoto action', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(typeof result.current.actions.analyzePhoto).toBe('function');
    });

    it('should provide reset action', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(typeof result.current.actions.reset).toBe('function');
    });

    it('should provide clearError action', () => {
      const { result } = renderHook(() => usePhotoAnalysis());

      expect(typeof result.current.actions.clearError).toBe('function');
    });
  });

  // ============================================================================
  // Upload Flow Tests
  // ============================================================================

  describe('Upload Flow', () => {
    it('should set status to uploading when analyzePhoto is called', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        result.current.actions.analyzePhoto(file);
        // Wait for first state update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should transition through uploading
      expect(result.current.state.status).not.toBe('idle');
    });

    it('should update progress during upload', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        result.current.actions.analyzePhoto(file);
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Progress should have started
      expect(result.current.state.progress).toBeGreaterThanOrEqual(10);
    });

    it('should call supabase auth.getUser', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(mockSupabaseAuth.getUser).toHaveBeenCalled();
    });

    it('should upload compressed image to storage', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseStorage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/photo.jpg' },
        }),
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(mockSupabaseStorage.from).toHaveBeenCalledWith('photos-compressed');
    });

    it('should create photo record in database', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('photos');
    });

    it('should invoke analyze-freight edge function', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(mockSupabaseFunctions.invoke).toHaveBeenCalledWith('analyze-freight', {
        body: {
          photoId: 'photo-123',
          forceReanalyze: false,
        },
      });
    });
  });

  // ============================================================================
  // Success Flow Tests
  // ============================================================================

  describe('Success Flow', () => {
    it('should set status to completed on success', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('completed');
    });

    it('should set progress to 100 on completion', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.progress).toBe(100);
    });

    it('should populate result with analysis data', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      const analysisResult = result.current.state.result;
      expect(analysisResult).not.toBeNull();
      expect(analysisResult?.analysisId).toBe('analysis-456');
      expect(analysisResult?.photoId).toBe('photo-123');
    });

    it('should format freight category names', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      // "machinery" should become "Machinery"
      expect(result.current.state.result?.freight.primaryCategory).toBe('Machinery');
    });

    it('should format hazard type names', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      // "unsecured_load" should become "Unsecured Load"
      expect(result.current.state.result?.hazards[0].hazardType).toBe('Unsecured Load');
    });

    it('should convert confidence scores to percentages', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      // 0.92 should become 92
      expect(result.current.state.result?.freight.confidence).toBe(92);
    });

    it('should include duration in milliseconds', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.result?.durationMs).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle authentication error', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Please sign in to analyze photos');
    });

    it('should handle missing user', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Please sign in to analyze photos');
    });

    it('should handle upload error', async () => {
      mockSupabaseStorage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: vi.fn(),
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toContain('Failed to upload');
    });

    it('should handle photo record creation error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toContain('Failed to save photo');
    });

    it('should handle edge function error', async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Analysis failed' },
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toContain('AI analysis failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseAuth.getUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Network error');
    });
  });

  // ============================================================================
  // Reset Tests
  // ============================================================================

  describe('Reset Action', () => {
    it('should reset status to idle', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('completed');

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state.status).toBe('idle');
    });

    it('should reset progress to zero', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.progress).toBe(100);

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state.progress).toBe(0);
    });

    it('should clear error', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Error' },
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.error).not.toBeNull();

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state.error).toBeNull();
    });

    it('should clear result', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.result).not.toBeNull();

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state.result).toBeNull();
    });
  });

  // ============================================================================
  // Clear Error Tests
  // ============================================================================

  describe('Clear Error Action', () => {
    it('should clear error message', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Error' },
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.error).not.toBeNull();

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });

    it('should reset status to idle when in error state', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Error' },
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('error');

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.status).toBe('idle');
    });

    it('should not change status if not in error state', async () => {
      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.status).toBe('completed');

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.status).toBe('completed');
    });
  });

  // ============================================================================
  // Asset ID Tests
  // ============================================================================

  describe('Asset ID Parameter', () => {
    it('should pass assetId to photo record when provided', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'photo-123' },
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file, 'asset-789');
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_id: 'asset-789',
        })
      );
    });

    it('should pass null assetId when not provided', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'photo-123' },
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_id: null,
        })
      );
    });
  });

  // ============================================================================
  // Memoization Tests
  // ============================================================================

  describe('Memoization', () => {
    it('should maintain stable state reference when values dont change', () => {
      const { result, rerender } = renderHook(() => usePhotoAnalysis());

      const firstState = result.current.state;
      rerender();
      const secondState = result.current.state;

      // State should be memoized
      expect(firstState).toBe(secondState);
    });

    it('should maintain stable actions reference', () => {
      const { result, rerender } = renderHook(() => usePhotoAnalysis());

      const firstActions = result.current.actions;
      rerender();
      const secondActions = result.current.actions;

      // Actions should be memoized
      expect(firstActions).toBe(secondActions);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty hazards array', async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: {
          analysisId: 'analysis-456',
          result: {
            primaryCategory: 'general',
            confidence: 0.9,
          },
          hazardAlerts: [],
          requiresAcknowledgment: false,
          blockedFromDeparture: false,
        },
        error: null,
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.result?.hazards).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: {
          analysisId: 'analysis-456',
          result: {
            primaryCategory: 'general',
            confidence: 0.9,
            // Missing optional fields
          },
          hazardAlerts: [],
        },
        error: null,
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.result?.freight.estimatedWeightKg).toBeUndefined();
      expect(result.current.state.result?.freight.loadDistributionScore).toBeUndefined();
      expect(result.current.state.result?.freight.restraintCount).toBeUndefined();
    });

    it('should default requiresAcknowledgment to false', async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: {
          analysisId: 'analysis-456',
          result: { primaryCategory: 'general', confidence: 0.9 },
          hazardAlerts: [],
          // Missing requiresAcknowledgment
        },
        error: null,
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.result?.requiresAcknowledgment).toBe(false);
    });

    it('should default blockedFromDeparture to false', async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: {
          analysisId: 'analysis-456',
          result: { primaryCategory: 'general', confidence: 0.9 },
          hazardAlerts: [],
          // Missing blockedFromDeparture
        },
        error: null,
      });

      const { result } = renderHook(() => usePhotoAnalysis());
      const file = createMockFile();

      await act(async () => {
        await result.current.actions.analyzePhoto(file);
      });

      expect(result.current.state.result?.blockedFromDeparture).toBe(false);
    });
  });
});
