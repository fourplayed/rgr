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

const DEFAULT_LIGHT_GRADIENT: GradientColors = {
  top: '#75b8ff',
  upperMiddle: '#5c8dff',
  lowerMiddle: '#477eff',
  bottom: '#1f62ff',
};

const DEFAULT_DARK_GRADIENT: GradientColors = {
  top: '#060f74',
  upperMiddle: '#000970',
  lowerMiddle: '#000757',
  bottom: '#080a21',
};

interface DevToolsState {
  // Workflow log
  workflowSteps: WorkflowStep[];
  workflowComplete: boolean;
  setWorkflowSteps: (steps: WorkflowStep[]) => void;
  setWorkflowComplete: (complete: boolean) => void;
  clearWorkflow: () => void;

  // Gradient customizer
  lightGradient: GradientColors;
  darkGradient: GradientColors;
  setLightGradient: (colors: Partial<GradientColors>) => void;
  setDarkGradient: (colors: Partial<GradientColors>) => void;
  resetGradient: (theme: 'light' | 'dark') => void;
  defaultLightGradient: GradientColors;
  defaultDarkGradient: GradientColors;

}

export const useDevToolsStore = create<DevToolsState>((set) => ({
  // Workflow
  workflowSteps: [],
  workflowComplete: false,
  setWorkflowSteps: (steps) => set({ workflowSteps: steps }),
  setWorkflowComplete: (complete) => set({ workflowComplete: complete }),
  clearWorkflow: () => set({ workflowSteps: [], workflowComplete: false }),

  // Gradient
  lightGradient: { ...DEFAULT_LIGHT_GRADIENT },
  darkGradient: { ...DEFAULT_DARK_GRADIENT },
  setLightGradient: (colors) =>
    set((s) => ({ lightGradient: { ...s.lightGradient, ...colors } })),
  setDarkGradient: (colors) =>
    set((s) => ({ darkGradient: { ...s.darkGradient, ...colors } })),
  resetGradient: (theme) =>
    set(
      theme === 'light'
        ? { lightGradient: { ...DEFAULT_LIGHT_GRADIENT } }
        : { darkGradient: { ...DEFAULT_DARK_GRADIENT } },
    ),
  defaultLightGradient: DEFAULT_LIGHT_GRADIENT,
  defaultDarkGradient: DEFAULT_DARK_GRADIENT,

}));
