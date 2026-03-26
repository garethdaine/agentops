import type { StateCreator } from 'zustand';

/** Panels (UI) slice state and actions. */
export interface PanelsSliceState {
  selectedAgent: string | null;
  panelVisible: boolean;
  setSelectedAgent: (id: string) => void;
  clearSelection: () => void;
  togglePanel: () => void;
}

/** Creates the panels slice with selection and visibility state. */
export const createPanelsSlice: StateCreator<PanelsSliceState, [], [], PanelsSliceState> = (set, get) => ({
  selectedAgent: null,
  panelVisible: false,

  setSelectedAgent: (id: string) => {
    set({ selectedAgent: id });
  },

  clearSelection: () => {
    set({ selectedAgent: null });
  },

  togglePanel: () => {
    set({ panelVisible: !get().panelVisible });
  },
});
