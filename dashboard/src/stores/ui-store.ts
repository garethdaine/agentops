import { createStore } from 'zustand/vanilla';

export interface UIStoreState {
  selectedAgent: string | null;
  panelVisible: boolean;

  setSelectedAgent: (id: string) => void;
  clearSelection: () => void;
  togglePanel: () => void;
}

export const useUIStore = createStore<UIStoreState>((set) => ({
  selectedAgent: null,
  panelVisible: false,

  setSelectedAgent: (id: string) => {
    set({ selectedAgent: id });
  },

  clearSelection: () => {
    set({ selectedAgent: null });
  },

  togglePanel: () => {
    set((state) => ({ panelVisible: !state.panelVisible }));
  },
}));
