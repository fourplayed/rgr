import { create } from 'zustand';

// --- Types ---

export type ConsoleLevel = 'info' | 'warn' | 'error' | 'debug';

export type ConsoleNamespace =
  | 'scan'
  | 'network'
  | 'auth'
  | 'location'
  | 'query'
  | 'mutation'
  | 'system';

export interface ConsoleEntry {
  id: number;
  timestamp: number;
  level: ConsoleLevel;
  namespace: ConsoleNamespace;
  message: string;
  data?: unknown;
}

// --- Constants ---

const MAX_ENTRIES = 300;
const EVICT_COUNT = 50;

// --- Store ---

interface ConsoleState {
  enabled: boolean;
  entries: ConsoleEntry[];
  isOpen: boolean;
  unreadCount: number;
  activeFilter: ConsoleNamespace | null;
  nextId: number;
  buttonY: number;
  heightOffset: number;

  setEnabled: (enabled: boolean) => void;
  addEntry: (level: ConsoleLevel, namespace: ConsoleNamespace, message: string, data?: unknown) => void;
  clearEntries: () => void;
  toggleOpen: () => void;
  setFilter: (filter: ConsoleNamespace | null) => void;
  setButtonY: (y: number) => void;
  growPanel: () => void;
  shrinkPanel: () => void;
}

export const useConsoleStore = create<ConsoleState>((set, get) => ({
  enabled: false,
  entries: [],
  isOpen: false,
  unreadCount: 0,
  activeFilter: null,
  nextId: 1,
  buttonY: 0, // set by ConsoleButton on mount and drag
  heightOffset: 0,

  setEnabled: (enabled) => set({ enabled, isOpen: enabled ? get().isOpen : false }),

  addEntry: (level, namespace, message, data) => {
    const { nextId, entries, isOpen } = get();
    const entry: ConsoleEntry = {
      id: nextId,
      timestamp: Date.now(),
      level,
      namespace,
      message,
      data,
    };

    let nextEntries: ConsoleEntry[];
    if (entries.length >= MAX_ENTRIES) {
      // Batch-evict oldest entries to avoid unbounded growth
      nextEntries = [...entries.slice(EVICT_COUNT), entry];
    } else {
      nextEntries = [...entries, entry];
    }

    set({
      entries: nextEntries,
      nextId: nextId + 1,
      unreadCount: isOpen ? 0 : get().unreadCount + 1,
    });
  },

  clearEntries: () => set({ entries: [], unreadCount: 0 }),

  toggleOpen: () => {
    const isOpen = !get().isOpen;
    set({ isOpen, unreadCount: isOpen ? 0 : get().unreadCount });
  },

  setFilter: (filter) => set({ activeFilter: filter }),

  setButtonY: (y) => set({ buttonY: y }),

  growPanel: () => set((s) => ({ heightOffset: Math.min(s.heightOffset + 100, 300) })),
  shrinkPanel: () => set((s) => ({ heightOffset: Math.max(s.heightOffset - 100, -200) })),
}));

/**
 * Standalone helper for non-React contexts (logger.ts, event handlers).
 */
export function consoleLog(
  level: ConsoleLevel,
  namespace: ConsoleNamespace,
  message: string,
  data?: unknown,
): void {
  useConsoleStore.getState().addEntry(level, namespace, message, data);
}
