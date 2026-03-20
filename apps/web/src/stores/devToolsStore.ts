import { create } from 'zustand';

export interface WorkflowStep {
  id: string;
  status: 'pending' | 'active' | 'success' | 'error';
  label: string;
  detail?: string;
  timestamp?: string;
}

export interface GradientColors {
  top: string;
  upperMiddle: string;
  lowerMiddle: string;
  bottom: string;
}

export interface DarkBgGradient {
  top: string;
  upperMiddle: string;
  lowerMiddle: string;
  bottom: string;
}

export interface PillarSettings {
  topColor: string;
  bottomColor: string;
  intensity: number;
  rotationSpeed: number;
  glowAmount: number;
  pillarWidth: number;
  pillarHeight: number;
}

const DEFAULT_LIGHT_GRADIENT: GradientColors = {
  top: '#0f3a7a',
  upperMiddle: '#1a4d9e',
  lowerMiddle: '#2460b8',
  bottom: '#0d3070',
};

const DEFAULT_DARK_BG_GRADIENT: DarkBgGradient = {
  top: '#529dff',
  upperMiddle: '#0469c8',
  lowerMiddle: '#0a0e43',
  bottom: '#00114d',
};

const DEFAULT_PILLAR_SETTINGS: PillarSettings = {
  topColor: '#3697f2',
  bottomColor: '#3a8fdf',
  intensity: 0.5,
  rotationSpeed: 0.1,
  glowAmount: 0.001,
  pillarWidth: 2,
  pillarHeight: 0.25,
};

const DEFAULT_LIGHT_PILLAR_SETTINGS: PillarSettings = {
  topColor: '#ffffff',
  bottomColor: '#d8eeff',
  intensity: 0.5,
  rotationSpeed: 0.1,
  glowAmount: 0.0005,
  pillarWidth: 1.5,
  pillarHeight: 0.25,
};

interface DevToolsState {
  // Workflow log
  workflowSteps: WorkflowStep[];
  workflowComplete: boolean;
  setWorkflowSteps: (steps: WorkflowStep[]) => void;
  setWorkflowComplete: (complete: boolean) => void;
  clearWorkflow: () => void;

  // Light background gradient
  lightGradient: GradientColors;
  setLightGradient: (colors: Partial<GradientColors>) => void;
  defaultLightGradient: GradientColors;

  // Dark background gradient
  darkBgGradient: DarkBgGradient;
  setDarkBgGradient: (colors: Partial<DarkBgGradient>) => void;
  defaultDarkBgGradient: DarkBgGradient;

  // Dark pillar settings
  pillarSettings: PillarSettings;
  setPillarSettings: (settings: Partial<PillarSettings>) => void;
  defaultPillarSettings: PillarSettings;

  // Light pillar settings
  lightPillarSettings: PillarSettings;
  setLightPillarSettings: (settings: Partial<PillarSettings>) => void;
  defaultLightPillarSettings: PillarSettings;
}

export const useDevToolsStore = create<DevToolsState>((set) => ({
  // Workflow
  workflowSteps: [],
  workflowComplete: false,
  setWorkflowSteps: (steps) => set({ workflowSteps: steps }),
  setWorkflowComplete: (complete) => set({ workflowComplete: complete }),
  clearWorkflow: () => set({ workflowSteps: [], workflowComplete: false }),

  // Light gradient
  lightGradient: { ...DEFAULT_LIGHT_GRADIENT },
  setLightGradient: (colors) => set((s) => ({ lightGradient: { ...s.lightGradient, ...colors } })),
  defaultLightGradient: DEFAULT_LIGHT_GRADIENT,

  // Dark bg gradient
  darkBgGradient: { ...DEFAULT_DARK_BG_GRADIENT },
  setDarkBgGradient: (colors) =>
    set((s) => ({ darkBgGradient: { ...s.darkBgGradient, ...colors } })),
  defaultDarkBgGradient: DEFAULT_DARK_BG_GRADIENT,

  // Dark pillar settings
  pillarSettings: { ...DEFAULT_PILLAR_SETTINGS },
  setPillarSettings: (settings) =>
    set((s) => ({ pillarSettings: { ...s.pillarSettings, ...settings } })),
  defaultPillarSettings: DEFAULT_PILLAR_SETTINGS,

  // Light pillar settings
  lightPillarSettings: { ...DEFAULT_LIGHT_PILLAR_SETTINGS },
  setLightPillarSettings: (settings) =>
    set((s) => ({ lightPillarSettings: { ...s.lightPillarSettings, ...settings } })),
  defaultLightPillarSettings: DEFAULT_LIGHT_PILLAR_SETTINGS,
}));
