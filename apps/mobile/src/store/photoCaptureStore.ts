import { create } from 'zustand';

export interface StartCaptureOptions {
  assetId: string;
  scanEventId?: string | null | undefined;
  locationDescription?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

/** Fields settable via `patch()` — the public surface for individual updates. */
type PatchableFields = Pick<PhotoCaptureState, 'capturedUri' | 'isUploading' | 'uploadError'>;

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
  patch: (partial: Partial<PatchableFields>) => void;
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

  patch: (partial) => set(partial),

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
