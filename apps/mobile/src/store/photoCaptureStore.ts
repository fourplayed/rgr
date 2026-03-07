import { create } from 'zustand';

export interface StartCaptureOptions {
  assetId: string;
  scanEventId?: string | null | undefined;
  locationDescription?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

interface PhotoCaptureState {
  // State
  capturedUri: string | null;
  assetId: string | null;
  scanEventId: string | null;
  locationDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  isUploading: boolean;
  uploadError: string | null;
  imageWidth: number | null;
  imageHeight: number | null;

  // Actions
  setCapturedUri: (uri: string | null) => void;
  setAssetId: (assetId: string | null) => void;
  setScanEventId: (scanEventId: string | null) => void;
  setLocationDescription: (location: string | null) => void;
  setIsUploading: (isUploading: boolean) => void;
  setUploadError: (error: string | null) => void;
  setImageDimensions: (width: number, height: number) => void;
  startCapture: (options: StartCaptureOptions) => void;
  reset: () => void;
}

const initialState = {
  capturedUri: null,
  assetId: null,
  scanEventId: null,
  locationDescription: null,
  latitude: null,
  longitude: null,
  isUploading: false,
  uploadError: null,
  imageWidth: null,
  imageHeight: null,
};

export const usePhotoCaptureStore = create<PhotoCaptureState>((set) => ({
  ...initialState,

  setCapturedUri: (uri) => set({ capturedUri: uri }),

  setAssetId: (assetId) => set({ assetId }),

  setScanEventId: (scanEventId) => set({ scanEventId }),

  setLocationDescription: (locationDescription) => set({ locationDescription }),

  setIsUploading: (isUploading) => set({ isUploading }),

  setUploadError: (error) => set({ uploadError: error }),

  setImageDimensions: (width, height) => set({ imageWidth: width, imageHeight: height }),

  startCapture: (options: StartCaptureOptions) =>
    set({
      ...initialState,
      assetId: options.assetId,
      scanEventId: options.scanEventId ?? null,
      locationDescription: options.locationDescription ?? null,
      latitude: options.latitude ?? null,
      longitude: options.longitude ?? null,
    }),

  reset: () => set(initialState),
}));
