import { create } from 'zustand';

interface DebugLocationState {
  overrideEnabled: boolean;
  latitude: number;
  longitude: number;
  setCoordinates: (lat: number, lon: number) => void;
  setEnabled: (enabled: boolean) => void;
}

export const useDebugLocationStore = create<DebugLocationState>((set) => ({
  overrideEnabled: false,
  latitude: 37.3349,
  longitude: -122.009,
  setCoordinates: (latitude, longitude) => set({ latitude, longitude }),
  setEnabled: (overrideEnabled) => set({ overrideEnabled }),
}));
