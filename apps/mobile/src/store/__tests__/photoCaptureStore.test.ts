import { usePhotoCaptureStore } from '../photoCaptureStore';

describe('usePhotoCaptureStore', () => {
  beforeEach(() => {
    usePhotoCaptureStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = usePhotoCaptureStore.getState();
    expect(state.assetId).toBeNull();
    expect(state.scanEventId).toBeNull();
    expect(state.capturedUri).toBeNull();
    expect(state.isUploading).toBe(false);
    expect(state.uploadError).toBeNull();
    expect(state.imageWidth).toBeNull();
    expect(state.imageHeight).toBeNull();
    expect(state.locationDescription).toBeNull();
    expect(state.latitude).toBeNull();
    expect(state.longitude).toBeNull();
  });

  it('startCapture sets assetId and resets others', () => {
    usePhotoCaptureStore.getState().startCapture({ assetId: 'asset-1' });
    const state = usePhotoCaptureStore.getState();
    expect(state.assetId).toBe('asset-1');
    expect(state.capturedUri).toBeNull();
    expect(state.isUploading).toBe(false);
    expect(state.uploadError).toBeNull();
  });

  it('startCapture with optional fields (scanEventId, location)', () => {
    usePhotoCaptureStore.getState().startCapture({
      assetId: 'asset-2',
      scanEventId: 'scan-1',
      locationDescription: 'Perth Depot',
      latitude: -31.95,
      longitude: 115.86,
    });
    const state = usePhotoCaptureStore.getState();
    expect(state.assetId).toBe('asset-2');
    expect(state.scanEventId).toBe('scan-1');
    expect(state.locationDescription).toBe('Perth Depot');
    expect(state.latitude).toBe(-31.95);
    expect(state.longitude).toBe(115.86);
  });

  it('setCapturedUri updates URI', () => {
    usePhotoCaptureStore.getState().setCapturedUri('file:///photo.jpg');
    expect(usePhotoCaptureStore.getState().capturedUri).toBe('file:///photo.jpg');
  });

  it('setIsUploading toggles uploading flag', () => {
    usePhotoCaptureStore.getState().setIsUploading(true);
    expect(usePhotoCaptureStore.getState().isUploading).toBe(true);
    usePhotoCaptureStore.getState().setIsUploading(false);
    expect(usePhotoCaptureStore.getState().isUploading).toBe(false);
  });

  it('setUploadError sets error while preserving capturedUri and assetId', () => {
    usePhotoCaptureStore.getState().startCapture({ assetId: 'asset-1' });
    usePhotoCaptureStore.getState().setCapturedUri('file:///photo.jpg');
    usePhotoCaptureStore.getState().setUploadError('Network error');
    const state = usePhotoCaptureStore.getState();
    expect(state.uploadError).toBe('Network error');
    expect(state.capturedUri).toBe('file:///photo.jpg');
    expect(state.assetId).toBe('asset-1');
  });

  it('setImageDimensions sets width and height', () => {
    usePhotoCaptureStore.getState().setImageDimensions(1920, 1080);
    const state = usePhotoCaptureStore.getState();
    expect(state.imageWidth).toBe(1920);
    expect(state.imageHeight).toBe(1080);
  });

  it('reset returns to initial state', () => {
    usePhotoCaptureStore.getState().startCapture({ assetId: 'asset-1' });
    usePhotoCaptureStore.getState().setCapturedUri('file:///photo.jpg');
    usePhotoCaptureStore.getState().setIsUploading(true);
    usePhotoCaptureStore.getState().reset();
    const state = usePhotoCaptureStore.getState();
    expect(state.assetId).toBeNull();
    expect(state.capturedUri).toBeNull();
    expect(state.isUploading).toBe(false);
    expect(state.uploadError).toBeNull();
  });

  it('error then startCapture clears previous error', () => {
    usePhotoCaptureStore.getState().setUploadError('Previous error');
    expect(usePhotoCaptureStore.getState().uploadError).toBe('Previous error');
    usePhotoCaptureStore.getState().startCapture({ assetId: 'asset-2' });
    expect(usePhotoCaptureStore.getState().uploadError).toBeNull();
  });
});
