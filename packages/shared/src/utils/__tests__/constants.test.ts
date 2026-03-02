import { MAX_PHOTO_SIZE_BYTES, STORAGE_BUCKETS } from '../constants';

describe('MAX_PHOTO_SIZE_BYTES', () => {
  it('equals 10MB exactly', () => {
    expect(MAX_PHOTO_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('STORAGE_BUCKETS', () => {
  it('has correct bucket names matching Supabase storage', () => {
    expect(STORAGE_BUCKETS.photos).toBe('photos-compressed');
    expect(STORAGE_BUCKETS.originals).toBe('photos-original');
    expect(STORAGE_BUCKETS.avatars).toBe('avatars');
  });

  it('has no unexpected keys', () => {
    expect(Object.keys(STORAGE_BUCKETS).sort()).toEqual(['avatars', 'originals', 'photos']);
  });
});
