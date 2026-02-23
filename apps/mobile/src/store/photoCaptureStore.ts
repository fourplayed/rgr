import { create } from 'zustand';

interface PhotoCaptureState {
  // State
  capturedUri: string | null;
  assetId: string | null;
  scanEventId: string | null;
  isUploading: boolean;
  uploadError: string | null;

  // Actions
  setCapturedUri: (uri: string | null) => void;
  setAssetId: (assetId: string | null) => void;
  setScanEventId: (scanEventId: string | null) => void;
  setIsUploading: (isUploading: boolean) => void;
  setUploadError: (error: string | null) => void;
  startCapture: (assetId: string, scanEventId?: string | null) => void;
  reset: () => void;
}

const initialState = {
  capturedUri: null,
  assetId: null,
  scanEventId: null,
  isUploading: false,
  uploadError: null,
};

export const usePhotoCaptureStore = create<PhotoCaptureState>((set) => ({
  ...initialState,

  setCapturedUri: (uri) => set({ capturedUri: uri }),

  setAssetId: (assetId) => set({ assetId }),

  setScanEventId: (scanEventId) => set({ scanEventId }),

  setIsUploading: (isUploading) => set({ isUploading }),

  setUploadError: (error) => set({ uploadError: error }),

  startCapture: (assetId, scanEventId = null) => set({
    ...initialState,
    assetId,
    scanEventId,
  }),

  reset: () => set(initialState),
}));
