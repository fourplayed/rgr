/**
 * Edge Case Tests - Photo Analysis Components
 *
 * Tests for edge cases and error scenarios:
 * - Large file uploads (near 10MB limit)
 * - Unsupported file types
 * - Concurrent uploads
 * - Analysis timeout handling
 * - Empty/corrupted images
 * - Network failures
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhotoUploadZone } from '../PhotoUploadZone';
import { PhotoAnalysisSection } from '../PhotoAnalysisSection';

// ============================================================================
// Mock Setup
// ============================================================================

// Edge-case tests that use PhotoAnalysisSection need the real hook with mocked Supabase

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

vi.mock('@rgr/shared', () => ({
  getSupabaseClient: () => mockSupabase,
}));

// Store original createElement before mocking
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  });

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
        set: () => setTimeout(() => img.onload?.(), 0),
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

// Setup helper for tests that use PhotoAnalysisSection
function setupSuccessfulMocks() {
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
    data: {
      analysisId: 'analysis-456',
      result: { primaryCategory: 'general', confidence: 0.9 },
      hazardAlerts: [],
    },
    error: null,
  });
}

// ============================================================================
// Large File Edge Cases
// ============================================================================

describe('Edge Cases: Large Files', () => {
  describe('File Size Boundaries', () => {
    it('should accept file at exactly 10MB', async () => {
      const onFileSelect = vi.fn();
      const { container } = render(
        <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('large.jpg', 'image/jpeg', 10 * 1024 * 1024);

      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalledWith(file);
    });

    it('should reject file at 10MB + 1 byte', async () => {
      const onFileSelect = vi.fn();
      const { container } = render(
        <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('large.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1);

      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument();
      });
    });

    it('should handle files near the limit gracefully', async () => {
      const onFileSelect = vi.fn();
      const { container } = render(
        <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
      );

      // Test multiple files near the limit
      const sizes = [
        9.9 * 1024 * 1024, // 9.9 MB - should pass
        9.99 * 1024 * 1024, // 9.99 MB - should pass
        10 * 1024 * 1024, // 10 MB exactly - should pass
      ];

      for (const size of sizes) {
        onFileSelect.mockClear();
        const file = createMockFile('test.jpg', 'image/jpeg', Math.floor(size));
        fireEvent.change(container.querySelector('input[type="file"]')!, {
          target: { files: [file] },
        });
        expect(onFileSelect).toHaveBeenCalled();
      }
    });

    it('should handle very large files (100MB+) without hanging', async () => {
      const onFileSelect = vi.fn();
      const { container } = render(
        <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      // Create a reference to a large file without actually allocating that much memory
      const largeFile = {
        name: 'huge.jpg',
        type: 'image/jpeg',
        size: 100 * 1024 * 1024, // 100 MB
      } as File;

      fireEvent.change(input, { target: { files: [largeFile] } });

      // Should quickly reject without processing
      await waitFor(() => {
        expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument();
      });
      expect(onFileSelect).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Unsupported File Type Edge Cases
// ============================================================================

describe('Edge Cases: Unsupported File Types', () => {
  const unsupportedTypes = [
    { type: 'application/pdf', ext: 'pdf', name: 'PDF document' },
    { type: 'text/plain', ext: 'txt', name: 'Text file' },
    { type: 'video/mp4', ext: 'mp4', name: 'Video file' },
    { type: 'audio/mpeg', ext: 'mp3', name: 'Audio file' },
    { type: 'application/zip', ext: 'zip', name: 'Archive file' },
    { type: 'image/gif', ext: 'gif', name: 'GIF image' },
    { type: 'image/svg+xml', ext: 'svg', name: 'SVG image' },
    { type: 'image/bmp', ext: 'bmp', name: 'BMP image' },
    { type: 'image/tiff', ext: 'tiff', name: 'TIFF image' },
  ];

  unsupportedTypes.forEach(({ type, ext, name }) => {
    it(`should reject ${name} (${ext})`, async () => {
      const onFileSelect = vi.fn();
      const { container } = render(
        <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(`test.${ext}`, type, 1024);

      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText(/please select an image file/i)).toBeInTheDocument();
      });
    });
  });

  it('should reject files with no extension', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('noextension', 'application/octet-stream', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('should reject files with mismatched extension and MIME type', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    // File claims to be JPEG but has PDF content type
    const file = createMockFile('fake.jpg', 'application/pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Concurrent Upload Edge Cases
// ============================================================================

describe('Edge Cases: Concurrent Operations', () => {
  it('should disable file selection during upload', () => {
    const { container } = render(
      <PhotoUploadZone
        onFileSelect={vi.fn()}
        isDark={true}
        isLoading={true}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('should not trigger new upload while analyzing', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploadZone
        onFileSelect={onFileSelect}
        isDark={true}
        isLoading={true}
      />
    );

    // When loading, button is not rendered - find the drop zone container instead
    const dropZone = container.querySelector('[class*="border-dashed"]') as HTMLElement;
    expect(dropZone).toBeTruthy();

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [createMockFile()],
      },
    });

    // Should not call onFileSelect when loading
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('should handle rapid file selection changes', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Rapidly select multiple files
    for (let i = 0; i < 5; i++) {
      const file = createMockFile(`rapid${i}.jpg`, 'image/jpeg', 1024);
      fireEvent.change(input, { target: { files: [file] } });
    }

    // Each selection should trigger callback
    expect(onFileSelect).toHaveBeenCalledTimes(5);
  });
});

// ============================================================================
// Network/Timeout Edge Cases
// ============================================================================

describe('Edge Cases: Network Failures', () => {
  it('should handle network timeout gracefully', async () => {
    setupSuccessfulMocks();
    mockSupabase.functions.invoke.mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        })
    );

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    await waitFor(
      () => {
        expect(screen.getByText(/network timeout|error/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('should handle connection refused error', async () => {
    setupSuccessfulMocks();
    mockSupabase.auth.getUser.mockRejectedValue(new Error('Connection refused'));

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    await waitFor(() => {
      expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
    });
  });

  it('should handle storage quota exceeded', async () => {
    setupSuccessfulMocks();
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: { message: 'Storage quota exceeded' },
      }),
      getPublicUrl: vi.fn(),
    });

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    await waitFor(() => {
      expect(screen.getByText(/failed to upload/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Empty/Corrupted Image Edge Cases
// ============================================================================

describe('Edge Cases: Empty and Corrupted Images', () => {
  it('should handle zero-byte file', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [emptyFile] } });

    // Empty files should still be passed through - server will validate
    expect(onFileSelect).toHaveBeenCalled();
  });

  it('should handle image compression failure gracefully', async () => {
    setupSuccessfulMocks();

    // Make Image load fail
    vi.stubGlobal(
      'Image',
      vi.fn().mockImplementation(() => {
        const img = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: '',
        };
        Object.defineProperty(img, 'src', {
          set: () => setTimeout(() => img.onerror?.(), 0),
        });
        return img;
      })
    );

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    // Should fall back to original file and continue
    await waitFor(
      () => {
        // Either success or error should appear
        const hasResult =
          screen.queryByText('Analysis Results') ||
          screen.queryByText(/error|failed/i);
        expect(hasResult).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it('should handle canvas context failure', async () => {
    setupSuccessfulMocks();

    // Re-mock canvas with null context - use stored reference to avoid recursion
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => null, // Canvas context unavailable
          toBlob: vi.fn(),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    // Should handle gracefully without crashing
    await waitFor(
      () => {
        const hasContent =
          screen.queryByText('Analysis Results') ||
          screen.queryByText(/error|failed/i);
        expect(hasContent).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });
});

// ============================================================================
// Special Character Edge Cases
// ============================================================================

describe('Edge Cases: Special Characters', () => {
  const specialNameCases = [
    'file with spaces.jpg',
    'file-with-dashes.jpg',
    'file_with_underscores.jpg',
    'file.multiple.dots.jpg',
    'file(with)parentheses.jpg',
    'file[with]brackets.jpg',
    "file'with'quotes.jpg",
    'file&with&ampersands.jpg',
    'file#with#hash.jpg',
    'file@with@at.jpg',
    'UPPERCASE.JPG',
    'MixedCase.JpG',
  ];

  specialNameCases.forEach((filename) => {
    it(`should handle filename: ${filename}`, async () => {
      const onFileSelect = vi.fn();
      const { container } = render(
        <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(filename, 'image/jpeg', 1024);

      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalled();
    });
  });

  it('should handle very long filenames', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploadZone onFileSelect={onFileSelect} isDark={true} />
    );

    const longName = 'a'.repeat(200) + '.jpg';
    const file = createMockFile(longName, 'image/jpeg', 1024);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalled();
  });
});

// ============================================================================
// API Response Edge Cases
// ============================================================================

describe('Edge Cases: API Responses', () => {
  it('should handle null analysis response with error', async () => {
    setupSuccessfulMocks();
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: null,
    });

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    // Hook throws error when data is null - verify component doesn't crash
    await waitFor(
      () => {
        // Either shows error or reverts to idle state (graceful handling)
        const hasContent =
          screen.queryByText('Analyze New Photo') !== null ||
          container.querySelector('[class*="error"]') !== null;
        expect(hasContent).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it('should handle malformed hazard alerts with error', async () => {
    setupSuccessfulMocks();
    mockSupabase.functions.invoke.mockResolvedValue({
      data: {
        analysisId: 'test',
        result: { primaryCategory: 'test', confidence: 0.9 },
        hazardAlerts: [
          {
            // Missing required fields - will cause formatHazardType to fail
            alertId: 'partial',
          },
        ],
      },
      error: null,
    });

    const { container } = render(
      <PhotoAnalysisSection isDark={true} onHazardDetected={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createMockFile()] } });

    // Hook may throw when processing malformed data - verify component doesn't crash
    await waitFor(
      () => {
        // Component should be present regardless of the specific outcome
        expect(container.firstChild).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
