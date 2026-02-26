import { MAX_PHOTO_SIZE_BYTES } from '../constants';

describe('MAX_PHOTO_SIZE_BYTES', () => {
  it('equals 10MB exactly', () => {
    expect(MAX_PHOTO_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});
