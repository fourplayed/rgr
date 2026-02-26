import { uploadPhoto } from '../photos';
import type { UploadPhotoOptions } from '../photos';

// Mock the Supabase client
const mockUpload = jest.fn();
const mockFrom = jest.fn(() => ({
  upload: mockUpload,
  remove: jest.fn().mockResolvedValue({ error: null }),
}));
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();

jest.mock('../client', () => ({
  getSupabaseClient: () => ({
    storage: { from: mockFrom },
    from: () => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const VALID_UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001';

const baseOptions: UploadPhotoOptions = {
  assetId: VALID_UUID_1,
  uploadedBy: VALID_UUID_2,
  photoType: 'freight',
  fileUri: 'file:///test.jpg',
  mimeType: 'image/jpeg',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('uploadPhoto', () => {
  it('rejects file exceeding 10MB', async () => {
    const oversizedBuffer = new ArrayBuffer(10 * 1024 * 1024 + 1); // 10MB + 1 byte
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(oversizedBuffer),
    });

    const result = await uploadPhoto(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds maximum size');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('accepts file at exactly 10MB', async () => {
    const exactBuffer = new ArrayBuffer(10 * 1024 * 1024); // exactly 10MB
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(exactBuffer),
    });
    mockUpload.mockResolvedValue({ error: null });
    mockSingle.mockResolvedValue({
      data: {
        id: VALID_UUID_1,
        asset_id: VALID_UUID_1,
        scan_event_id: null,
        uploaded_by: VALID_UUID_2,
        photo_type: 'freight',
        storage_path: `photos/${VALID_UUID_1}/test.jpg`,
        thumbnail_path: null,
        filename: 'test.jpg',
        file_size: 10 * 1024 * 1024,
        mime_type: 'image/jpeg',
        width: null,
        height: null,
        location_description: null,
        latitude: null,
        longitude: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await uploadPhoto(baseOptions);

    expect(result.success).toBe(true);
    expect(mockUpload).toHaveBeenCalled();
  });

  it('rejects empty file', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(emptyBuffer),
    });

    const result = await uploadPhoto(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain('empty content');
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
