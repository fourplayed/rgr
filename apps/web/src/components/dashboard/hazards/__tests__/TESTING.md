# Hazard Detection Components - Testing Documentation

## Overview

This document describes the test suite for the Neural Network Image Recognition/Hazard Detection feature, including test organization, coverage targets, and browser compatibility requirements.

## Test Files Structure

```
packages/web/src/
  components/dashboard/hazards/__tests__/
    PhotoUploadZone.test.tsx      # Unit tests for upload component
    AnalysisResultCard.test.tsx   # Unit tests for result display
    PhotoAnalysisSection.test.tsx # Unit tests for main section
    integration.test.tsx          # Full flow integration tests
    edge-cases.test.tsx           # Edge case and error scenarios
    accessibility.test.tsx        # WCAG 2.1 AA compliance tests
    TESTING.md                    # This documentation
  hooks/__tests__/
    usePhotoAnalysis.test.ts      # Hook unit tests
```

## Coverage Targets

| Component | Target | Key Areas |
|-----------|--------|-----------|
| PhotoUploadZone | 85%+ | Drag/drop, validation, preview |
| AnalysisResultCard | 80%+ | Rendering, interactions |
| PhotoAnalysisSection | 80%+ | State transitions |
| usePhotoAnalysis | 85%+ | API flow, error handling |

**Overall Target: 80%+ line coverage**

## Running Tests

```bash
# Run all hazard component tests
npm run test -- src/components/dashboard/hazards

# Run with coverage
npm run test:coverage -- src/components/dashboard/hazards

# Run specific test file
npm run test -- src/components/dashboard/hazards/__tests__/PhotoUploadZone.test.tsx

# Run hook tests
npm run test -- src/hooks/__tests__/usePhotoAnalysis.test.ts

# Run accessibility tests only
npm run test -- src/components/dashboard/hazards/__tests__/accessibility.test.tsx

# Watch mode for development
npm run test:watch -- src/components/dashboard/hazards
```

## Test Categories

### 1. Unit Tests

**PhotoUploadZone.test.tsx**
- Rendering (upload zone, instructions, file input)
- Theme support (dark/light)
- File selection via click
- Drag and drop functionality
- File validation (type, size)
- Preview management
- Loading states
- Disabled states
- Error display
- Keyboard accessibility
- Edge cases (empty files, special characters)

**AnalysisResultCard.test.tsx**
- Rendering (header, duration, thumbnail)
- Freight metrics display
- Hazard display and severity badges
- Departure blocking warnings
- No hazards (all clear) state
- Recommended actions expansion
- Action buttons
- Theme support
- Multiple hazards handling

**PhotoAnalysisSection.test.tsx**
- State rendering (idle, uploading, analyzing, completed, error)
- File selection triggering analysis
- Progress tracking
- Action callbacks
- Theme consistency
- State transitions

### 2. Hook Tests (usePhotoAnalysis.test.ts)

- Initial state
- Upload flow
- Progress tracking
- Success flow with data transformation
- Error handling (auth, upload, analysis)
- Reset action
- Clear error action
- Asset ID parameter
- Memoization stability

### 3. Integration Tests (integration.test.tsx)

- Full upload to results flow
- Error recovery flows
- File validation before API calls
- Theme consistency through flow
- No hazards detected flow
- Critical hazards with departure blocking

### 4. Edge Case Tests (edge-cases.test.tsx)

**File Size Boundaries**
- Exactly 10MB (should pass)
- 10MB + 1 byte (should fail)
- Very large files (100MB+)

**Unsupported File Types**
- PDF, TXT, MP4, MP3, ZIP
- GIF, SVG, BMP, TIFF
- No extension files
- Mismatched MIME types

**Concurrent Operations**
- Disabled during upload
- No new uploads while analyzing
- Rapid file selection changes

**Network Failures**
- Timeout handling
- Connection refused
- Storage quota exceeded

**Empty/Corrupted Images**
- Zero-byte files
- Compression failures
- Canvas context failures

**Special Characters**
- Spaces, dashes, underscores
- Parentheses, brackets
- Very long filenames

**API Response Edge Cases**
- Null responses
- Malformed hazard alerts

### 5. Accessibility Tests (accessibility.test.tsx)

**Keyboard Navigation**
- Focus via tab
- Activation via Enter/Space
- Disabled state behavior

**ARIA Attributes**
- role="button"
- aria-label
- tabIndex management

**Focus Management**
- Visible focus indicators
- Focus retention after errors

**Screen Reader Support**
- Loading state announcements
- Error message announcements
- Alt text for images

**Axe Audits**
- All component states
- Both themes (dark/light)

## Browser Compatibility

### Supported Browsers

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |
| Mobile Safari | iOS 14+ | Full |
| Chrome Mobile | Android 10+ | Full |

### Browser-Specific Notes

#### File Input Behavior
- **Safari**: HEIC/HEIF files may require additional processing
- **Firefox**: Large file handling may be slower
- **Mobile browsers**: Touch-based drag-drop limited

#### Canvas API
- All modern browsers support canvas for image compression
- WebP encoding not supported in older Safari versions

#### Drag and Drop
- Mobile browsers have limited drag-drop support
- Touch events handled via click alternative

#### File API
- All supported browsers implement File API
- FileReader used for preview generation

### Known Limitations

1. **HEIC Files**: Native HEIC viewing requires Safari or conversion
2. **Large Files**: Files over 5MB may cause slower preview generation
3. **Mobile Drag-Drop**: Not supported; use tap-to-upload instead
4. **Offline Mode**: Upload requires active network connection

## Mocking Strategy

### External Dependencies

```typescript
// Supabase client mock
vi.mock('@rgr/shared', () => ({
  getSupabase: () => mockSupabase,
}));

// URL API for blob handling
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn(),
});

// Image constructor for compression
vi.stubGlobal('Image', vi.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: '',
})));

// Canvas for image processing
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'canvas') return mockCanvas;
  return document.createElement(tag);
});
```

### Hook Mocking

```typescript
vi.mock('@/hooks/usePhotoAnalysis', () => ({
  usePhotoAnalysis: vi.fn(),
}));

// Configure mock state
vi.mocked(usePhotoAnalysis).mockReturnValue({
  state: { status: 'idle', progress: 0, error: null, result: null },
  actions: { analyzePhoto: vi.fn(), reset: vi.fn(), clearError: vi.fn() },
});
```

## Test Data Factories

### Mock File Creation
```typescript
function createMockFile(
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  size: number = 1024
): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}
```

### Mock Analysis Result
```typescript
function createMockResult(): AnalysisResult {
  return {
    analysisId: 'analysis-123',
    photoId: 'photo-456',
    photoUrl: 'https://example.com/photo.jpg',
    freight: { ... },
    hazards: [ ... ],
    requiresAcknowledgment: false,
    blockedFromDeparture: false,
    analyzedAt: new Date().toISOString(),
    durationMs: 2500,
  };
}
```

## CI/CD Integration

Tests are run automatically via GitHub Actions:

```yaml
- name: Run Tests
  run: npm run test -- --coverage

- name: Check Coverage
  run: |
    coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$coverage < 80" | bc -l) )); then
      echo "Coverage below 80%: $coverage"
      exit 1
    fi
```

## Debugging Tests

### Common Issues

1. **Async State Updates**: Use `waitFor` for state changes
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Analysis Results')).toBeInTheDocument();
   });
   ```

2. **Mock Not Resetting**: Ensure `vi.clearAllMocks()` in `beforeEach`

3. **URL Mock Issues**: Stub globally before each test
   ```typescript
   beforeEach(() => {
     vi.stubGlobal('URL', { ... });
   });
   afterEach(() => {
     vi.unstubAllGlobals();
   });
   ```

4. **File Input Testing**: Use `fireEvent.change` not `userEvent.upload`
   ```typescript
   fireEvent.change(input, { target: { files: [file] } });
   ```

### Debugging Commands

```bash
# Run single test with verbose output
npm run test -- --reporter=verbose PhotoUploadZone.test.tsx

# Run with browser UI
npm run test:ui

# Generate detailed coverage report
npm run test:coverage -- --reporter=html
```

## Performance Considerations

- Tests use mocked APIs to avoid network latency
- Image compression mocked to prevent CPU-intensive operations
- File creation uses minimal content for speed
- Parallel test execution via `pool: 'forks'`

## Maintenance

When updating components:

1. Run existing tests to catch regressions
2. Add new tests for new functionality
3. Update edge case tests if validation changes
4. Re-run accessibility audit after UI changes
5. Check coverage hasn't dropped below 80%
